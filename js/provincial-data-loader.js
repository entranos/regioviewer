/**
 * Provincial Data Loader
 * Loads and queries industrial demand data at the province level
 */

class ProvincialDataLoader {
  constructor() {
    this.data = {};
    this.loaded = false;
  }

  async loadAllData() {
    console.log('Loading provincial industrial data...');
    
    const scenarios = [
      'Eigen Vermogen',
      'Gezamenlijke Balans',
      'Horizon Aanvoer',
      'Koersvaste Middenweg'
    ];
    
    const years = {
      'Eigen Vermogen': [2030, 2035, 2040, 2050],
      'Gezamenlijke Balans': [2030, 2035, 2040, 2050],
      'Horizon Aanvoer': [2030, 2035, 2040, 2050],
      'Koersvaste Middenweg': [2025, 2030, 2035, 2040, 2050]
    };
    
    const carriers = ['ELEC', 'H2', 'METH'];
    const metricTypes = ['volume', 'capacity'];
    
    const loadPromises = [];
    
    for (const scenario of scenarios) {
      this.data[scenario] = {};
      
      for (const year of years[scenario]) {
        this.data[scenario][year] = {};
        const filename = `Scenario ${scenario} ${year} Provinciedata.xlsx`;
        const filepath = `data/provincial/${filename}`;
        
        const promise = fetch(filepath)
          .then(response => {
            if (!response.ok) {
              console.warn(`Failed to load ${filename}`);
              return null;
            }
            return response.arrayBuffer();
          })
          .then(buffer => {
            if (!buffer) return;
            
            const workbook = XLSX.read(buffer, { type: 'array' });
            
            for (const carrier of carriers) {
              if (!this.data[scenario][year][carrier]) {
                this.data[scenario][year][carrier] = {};
              }
              
              for (const metricType of metricTypes) {
                const sheetName = `Industry (${carrier}, ${metricType})`;
                
                if (!workbook.Sheets[sheetName]) {
                  console.warn(`Sheet ${sheetName} not found in ${filename}`);
                  continue;
                }
                
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                
                if (!this.data[scenario][year][carrier][metricType]) {
                  this.data[scenario][year][carrier][metricType] = {};
                }
                
                this.parseSheetData(jsonData, this.data[scenario][year][carrier][metricType]);
              }
            }
          })
          .catch(error => {
            console.error(`Error loading ${filename}:`, error);
          });
        
        loadPromises.push(promise);
      }
    }
    
    await Promise.all(loadPromises);
    this.loaded = true;
    console.log('Provincial industrial data loaded successfully');
    console.log('Provincial data structure:', this.data);
  }

  parseSheetData(jsonData, targetObject) {
    if (jsonData.length < 7) return;
    
    // Row 4 (index 3) contains TYPE information
    const typeRow = jsonData[3];
    // Row 5 (index 4) contains SECTOR information
    const sectorRow = jsonData[4];
    
    // Create mapping of column index to type and sector
    const columnMapping = [];
    for (let col = 2; col < typeRow.length; col++) {
      if (typeRow[col] && sectorRow[col]) {
        columnMapping[col] = {
          type: typeRow[col],
          sector: sectorRow[col]
        };
      }
    }
    
    // Parse data rows (starting from row 7, index 6)
    for (let row = 6; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData || rowData.length < 2) continue;
      
      const provinceCode = rowData[0];
      const provinceName = rowData[1];
      
      if (!provinceCode || !provinceName) continue;
      
      // Normalize province name to match our mapping
      const normalizedProvinceName = provinceName.toLowerCase().replace(/-/g, '');
      
      if (!targetObject[normalizedProvinceName]) {
        targetObject[normalizedProvinceName] = {};
      }
      
      // Parse each data column
      for (let col = 2; col < rowData.length; col++) {
        if (!columnMapping[col]) continue;
        
        const { type, sector } = columnMapping[col];
        const value = rowData[col];
        
        if (!targetObject[normalizedProvinceName][type]) {
          targetObject[normalizedProvinceName][type] = {};
        }
        
        if (!targetObject[normalizedProvinceName][type][sector]) {
          targetObject[normalizedProvinceName][type][sector] = value;
        }
      }
    }
  }

  /**
   * Query provincial data
   * @param {Object} params - Query parameters
   * @param {string} params.scenario - Scenario name
   * @param {number} params.year - Year
   * @param {string} params.carrier - Carrier code (ELEC, H2, METH)
   * @param {string} params.metricType - Metric type (volume or capacity)
   * @param {string} params.province - Province name (normalized)
   * @param {string} params.type - Type (Demand, Flexibility, Supply)
   * @param {string} params.sector - Sector name
   * @returns {string|number} - The queried value or error message
   */
  query(params) {
    const { scenario, year, carrier, metricType, province, type, sector } = params;
    
    if (!this.loaded) {
      return 'ERROR - data not loaded yet';
    }
    
    try {
      const scenarioData = this.data[scenario];
      if (!scenarioData) return 'ERROR - data not available';
      
      const yearData = scenarioData[year];
      if (!yearData) return 'ERROR - data not available';
      
      const carrierData = yearData[carrier];
      if (!carrierData) return 'ERROR - data not available';
      
      const metricData = carrierData[metricType];
      if (!metricData) return 'ERROR - data not available';
      
      const provinceData = metricData[province];
      if (!provinceData) return 'ERROR - data not available';
      
      const typeData = provinceData[type];
      if (!typeData) return 'ERROR - data not available';
      
      const value = typeData[sector];
      if (value === undefined || value === null || value === '') {
        return 'ERROR - data not available';
      }
      
      // Parse the value (remove commas if present)
      const parsedValue = typeof value === 'string' 
        ? parseFloat(value.replace(/,/g, ''))
        : value;
      
      return isNaN(parsedValue) ? 'ERROR - data not available' : parsedValue;
    } catch (error) {
      console.error('Error querying provincial data:', error);
      return 'ERROR - data not available';
    }
  }

  /**
   * Get all available sectors for a given carrier, type combination
   * @param {string} carrier - Carrier code
   * @param {string} type - Type
   * @returns {Array} Array of sector names
   */
  getSectorsForCarrierAndType(carrier, type) {
    if (!this.loaded) return [];
    
    const sectors = new Set();
    
    try {
      for (const scenario in this.data) {
        for (const year in this.data[scenario]) {
          const carrierData = this.data[scenario][year][carrier];
          if (!carrierData) continue;
          
          for (const metricType in carrierData) {
            const metricData = carrierData[metricType];
            
            for (const province in metricData) {
              const provinceData = metricData[province];
              if (provinceData[type]) {
                Object.keys(provinceData[type]).forEach(sector => sectors.add(sector));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting sectors:', error);
    }
    
    return Array.from(sectors).sort();
  }

  /**
   * Get all available types for a carrier
   * @param {string} carrier - Carrier code
   * @returns {Array} Array of type names
   */
  getTypesForCarrier(carrier) {
    if (!this.loaded) return [];
    
    const types = new Set();
    
    try {
      for (const scenario in this.data) {
        for (const year in this.data[scenario]) {
          const carrierData = this.data[scenario][year][carrier];
          if (!carrierData) continue;
          
          for (const metricType in carrierData) {
            const metricData = carrierData[metricType];
            
            for (const province in metricData) {
              const provinceData = metricData[province];
              Object.keys(provinceData).forEach(type => types.add(type));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting types:', error);
    }
    
    return Array.from(types).sort();
  }

  /**
   * Calculate total across all provinces for given parameters
   * @param {Object} params - Query parameters (without province)
   * @returns {number} Total value across all provinces
   */
  calculateTotal(params) {
    const provinces = [
      'groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland',
      'gelderland', 'utrecht', 'noordholland', 'zuidholland',
      'zeeland', 'noordbrabant', 'limburg'
    ];
    
    let total = 0;
    let hasData = false;
    
    provinces.forEach(province => {
      const value = this.query({ ...params, province });
      if (value !== 'ERROR - data not available' && !isNaN(parseFloat(value))) {
        total += Math.abs(parseFloat(value));
        hasData = true;
      }
    });
    
    return hasData ? total : null;
  }
}

// Create global instance
const provincialDataLoader = new ProvincialDataLoader();

