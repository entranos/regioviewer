/**
 * Municipal Data Loader
 * Loads and queries data from municipal XLSX files
 */

class MunicipalDataLoader {
  constructor() {
    this.data = {};
    this.loaded = false;
    this.loading = false;
    
    // Define scenarios and years
    this.scenarios = [
      'Eigen Vermogen',
      'Gezamenlijke Balans',
      'Horizon Aanvoer',
      'Koersvaste Middenweg'
    ];
    
    this.years = {
      'Eigen Vermogen': [2030, 2035, 2040, 2050],
      'Gezamenlijke Balans': [2030, 2035, 2040, 2050],
      'Horizon Aanvoer': [2030, 2035, 2040, 2050],
      'Koersvaste Middenweg': [2025, 2030, 2035, 2040, 2050]
    };
    
    // Define sheet names for each carrier and metric type
    this.sheetNames = {
      'ELEC': {
        'capacity': 'Municipality (ELEC, capacity)',
        'volume': 'Municipality (ELEC, volume)'
      },
      'H2': {
        'capacity': 'Municipality (H2, capacity)',
        'volume': 'Municipality (H2, volume)'
      },
      'METH': {
        'capacity': 'Municipality (METH, capacity)',
        'volume': 'Municipality (METH, volume)'
      }
    };
  }
  
  /**
   * Load all XLSX files
   * @returns {Promise} Promise that resolves when all files are loaded
   */
  async loadAllData() {
    if (this.loaded) {
      return Promise.resolve();
    }
    
    if (this.loading) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.loaded) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    this.loading = true;
    const loadPromises = [];
    
    // Load all scenario/year combinations
    for (const scenario of this.scenarios) {
      for (const year of this.years[scenario]) {
        const filename = `Scenario ${scenario} ${year} Gemeentendata.xlsx`;
        const path = `data/municipal/${filename}`;
        loadPromises.push(this.loadFile(scenario, year, path));
      }
    }
    
    try {
      await Promise.all(loadPromises);
      this.loaded = true;
      this.loading = false;
      console.log('All municipal data loaded successfully');
    } catch (error) {
      this.loading = false;
      console.error('Error loading municipal data:', error);
      throw error;
    }
  }
  
  /**
   * Load a single XLSX file
   * @param {string} scenario - Scenario name
   * @param {number} year - Year
   * @param {string} path - File path
   * @returns {Promise}
   */
  async loadFile(scenario, year, path) {
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Initialize data structure for this scenario/year
      if (!this.data[scenario]) {
        this.data[scenario] = {};
      }
      if (!this.data[scenario][year]) {
        this.data[scenario][year] = {};
      }
      
      // Process each sheet (carrier/metric combination)
      for (const carrier in this.sheetNames) {
        if (!this.data[scenario][year][carrier]) {
          this.data[scenario][year][carrier] = {};
        }
        
        for (const metricType in this.sheetNames[carrier]) {
          const sheetName = this.sheetNames[carrier][metricType];
          const sheet = workbook.Sheets[sheetName];
          
          if (!sheet) {
            console.warn(`Sheet ${sheetName} not found in ${path}`);
            continue;
          }
          
          // Parse the sheet data
          const parsedData = this.parseSheet(sheet);
          this.data[scenario][year][carrier][metricType] = parsedData;
        }
      }
    } catch (error) {
      console.error(`Error loading file ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Parse a worksheet into a structured format
   * @param {Object} sheet - XLSX sheet object
   * @returns {Object} Parsed data structure
   */
  parseSheet(sheet) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const data = {};
    
    // Read header rows (rows 0-4 are metadata, row 5 is headers)
    // Row 3 (index 3): TYPE
    // Row 4 (index 4): SECTOR
    const types = [];
    const sectors = [];
    
    for (let col = range.s.c + 2; col <= range.e.c; col++) {
      const typeCell = sheet[XLSX.utils.encode_cell({ r: 3, c: col })];
      const sectorCell = sheet[XLSX.utils.encode_cell({ r: 4, c: col })];
      
      types.push(typeCell ? typeCell.v : '');
      sectors.push(sectorCell ? sectorCell.v : '');
    }
    
    // Read data rows (starting from row 6)
    for (let row = 6; row <= range.e.r; row++) {
      // Get municipality code (column 0)
      const gmCodeCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (!gmCodeCell) continue;
      
      const gmCode = gmCodeCell.v;
      if (!data[gmCode]) {
        data[gmCode] = {};
      }
      
      // Read values for each type/sector combination
      for (let i = 0; i < types.length; i++) {
        const col = i + 2; // Data starts at column 2
        const type = types[i];
        const sector = sectors[i];
        
        if (!type || !sector) continue;
        
        if (!data[gmCode][type]) {
          data[gmCode][type] = {};
        }
        
        const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        const value = valueCell ? valueCell.v : null;
        
        data[gmCode][type][sector] = value;
      }
    }
    
    return data;
  }
  
  /**
   * Query data with specified parameters
   * @param {Object} params - Query parameters
   * @param {string} params.scenario - Scenario name
   * @param {number} params.year - Year
   * @param {string} params.carrier - Carrier (ELEC, H2, METH)
   * @param {string} params.metricType - Metric type (capacity, volume)
   * @param {string} params.gmCode - Municipality code (e.g., 'GM0014')
   * @param {string} params.type - Type (Demand, Exchange, Flexibility, Supply)
   * @param {string} params.sector - Sector name
   * @returns {number|string} Data value or 'ERROR - data not available'
   */
  query(params) {
    const { scenario, year, carrier, metricType, gmCode, type, sector } = params;
    
    // Check if data is loaded
    if (!this.loaded) {
      console.warn('Data not loaded yet. Call loadAllData() first.');
      return 'ERROR - data not available';
    }
    
    // Validate parameters
    if (!scenario || !year || !carrier || !metricType || !gmCode || !type || !sector) {
      console.warn('Missing required parameters:', params);
      return 'ERROR - data not available';
    }
    
    // Navigate through the data structure
    try {
      const scenarioData = this.data[scenario];
      if (!scenarioData) {
        return 'ERROR - data not available';
      }
      
      const yearData = scenarioData[year];
      if (!yearData) {
        return 'ERROR - data not available';
      }
      
      const carrierData = yearData[carrier];
      if (!carrierData) {
        return 'ERROR - data not available';
      }
      
      const metricData = carrierData[metricType];
      if (!metricData) {
        return 'ERROR - data not available';
      }
      
      const municipalityData = metricData[gmCode];
      if (!municipalityData) {
        return 'ERROR - data not available';
      }
      
      const typeData = municipalityData[type];
      if (!typeData) {
        return 'ERROR - data not available';
      }
      
      const value = typeData[sector];
      if (value === null || value === undefined) {
        return 'ERROR - data not available';
      }
      
      return value;
    } catch (error) {
      console.error('Error querying data:', error);
      return 'ERROR - data not available';
    }
  }
  
  /**
   * Get all available scenarios
   * @returns {Array<string>} List of scenarios
   */
  getScenarios() {
    return this.scenarios;
  }
  
  /**
   * Get available years for a scenario
   * @param {string} scenario - Scenario name
   * @returns {Array<number>} List of years
   */
  getYears(scenario) {
    return this.years[scenario] || [];
  }
  
  /**
   * Get all available carriers
   * @returns {Array<string>} List of carriers
   */
  getCarriers() {
    return Object.keys(this.sheetNames);
  }
  
  /**
   * Get all available metric types
   * @returns {Array<string>} List of metric types
   */
  getMetricTypes() {
    return ['capacity', 'volume'];
  }
}

// Create a global instance
const municipalDataLoader = new MunicipalDataLoader();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MunicipalDataLoader;
}

