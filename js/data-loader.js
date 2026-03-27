/**
 * Unified Data Loader
 * Loads and queries data from combined XLSX files (municipal + provincial)
 */

class DataLoader {
  constructor() {
    this.municipalData = {};
    this.provincialData = {};
    this.loaded = false;
    this.loading = false;

    // Define scenarios and years
    this.scenarios = [
      'Eigen Vermogen',
      'Gezamenlijke Balans',
      'Horizon Aanvoer',
      'Koersvaste Middenweg'
    ];

    // Track which scenarios are the original/default ones
    this.defaultScenarios = new Set(this.scenarios);

    this.years = {
      'Eigen Vermogen': [2030, 2035, 2040, 2050],
      'Gezamenlijke Balans': [2030, 2035, 2040, 2050],
      'Horizon Aanvoer': [2030, 2035, 2040, 2050],
      'Koersvaste Middenweg': [2025, 2030, 2035, 2040, 2050]
    };

    // Municipal sheet names
    this.municipalSheetNames = {
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

    // Provincial sheet names
    this.provincialSheetNames = {
      'ELEC': {
        'capacity': 'Industry (ELEC, capacity)',
        'volume': 'Industry (ELEC, volume)'
      },
      'H2': {
        'capacity': 'Industry (H2, capacity)',
        'volume': 'Industry (H2, volume)'
      },
      'METH': {
        'capacity': 'Industry (METH, capacity)',
        'volume': 'Industry (METH, volume)'
      }
    };
  }

  /**
   * Load all combined XLSX files
   * @returns {Promise} Promise that resolves when all files are loaded
   */
  async loadAllData() {
    if (this.loaded) {
      return Promise.resolve();
    }

    if (this.loading) {
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

    for (const scenario of this.scenarios) {
      for (const year of this.years[scenario]) {
        const filename = `Scenario ${scenario} ${year}.xlsx`;
        const path = `data/combined/${filename}`;
        loadPromises.push(this.loadFile(scenario, year, path));
      }
    }

    try {
      await Promise.all(loadPromises);
      this.loaded = true;
      this.loading = false;
      console.log('All data loaded successfully');
    } catch (error) {
      this.loading = false;
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Load a single combined XLSX file
   */
  async loadFile(scenario, year, path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`Failed to load ${path}`);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Initialize data structures
      if (!this.municipalData[scenario]) this.municipalData[scenario] = {};
      if (!this.municipalData[scenario][year]) this.municipalData[scenario][year] = {};
      if (!this.provincialData[scenario]) this.provincialData[scenario] = {};
      if (!this.provincialData[scenario][year]) this.provincialData[scenario][year] = {};

      const carriers = ['ELEC', 'H2', 'METH'];
      const metricTypes = ['capacity', 'volume'];

      for (const carrier of carriers) {
        // Municipal data
        if (!this.municipalData[scenario][year][carrier]) {
          this.municipalData[scenario][year][carrier] = {};
        }

        for (const metricType of metricTypes) {
          // Parse municipal sheet
          const municipalSheetName = this.municipalSheetNames[carrier][metricType];
          const municipalSheet = workbook.Sheets[municipalSheetName];
          if (municipalSheet) {
            this.municipalData[scenario][year][carrier][metricType] = this.parseMunicipalSheet(municipalSheet);
          } else {
            console.warn(`Sheet ${municipalSheetName} not found in ${path}`);
          }

          // Parse provincial sheet
          const provincialSheetName = this.provincialSheetNames[carrier][metricType];
          const provincialSheet = workbook.Sheets[provincialSheetName];
          if (provincialSheet) {
            if (!this.provincialData[scenario][year][carrier]) {
              this.provincialData[scenario][year][carrier] = {};
            }
            if (!this.provincialData[scenario][year][carrier][metricType]) {
              this.provincialData[scenario][year][carrier][metricType] = {};
            }
            const jsonData = XLSX.utils.sheet_to_json(provincialSheet, { header: 1 });
            this.parseProvincialSheetData(jsonData, this.provincialData[scenario][year][carrier][metricType]);
          } else {
            console.warn(`Sheet ${provincialSheetName} not found in ${path}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Parse a municipal worksheet into a structured format
   */
  parseMunicipalSheet(sheet) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const data = {};

    const columns = []; // ordered [{type, sector}]

    for (let col = range.s.c + 2; col <= range.e.c; col++) {
      const typeCell = sheet[XLSX.utils.encode_cell({ r: 3, c: col })];
      const sectorCell = sheet[XLSX.utils.encode_cell({ r: 4, c: col })];
      columns.push({
        type: typeCell ? typeCell.v : '',
        sector: sectorCell ? sectorCell.v : ''
      });
    }

    data._columns = columns;

    for (let row = 6; row <= range.e.r; row++) {
      const gmCodeCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (!gmCodeCell) continue;

      const gmCode = gmCodeCell.v;
      if (!data[gmCode]) {
        const gmNameCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
        data[gmCode] = { _gmName: gmNameCell ? gmNameCell.v : '' };
      }

      for (let i = 0; i < columns.length; i++) {
        const { type, sector } = columns[i];
        if (!type || !sector) continue;

        if (!data[gmCode][type]) data[gmCode][type] = {};

        const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: i + 2 })];
        data[gmCode][type][sector] = valueCell ? valueCell.v : null;
      }
    }

    return data;
  }

  /**
   * Parse provincial sheet data
   */
  parseProvincialSheetData(jsonData, targetObject) {
    if (jsonData.length < 7) return;

    const typeRow = jsonData[3];
    const sectorRow = jsonData[4];

    const columns = []; // ordered [{type, sector}], index matches col-2
    const columnMapping = [];
    for (let col = 2; col < typeRow.length; col++) {
      if (typeRow[col] && sectorRow[col]) {
        const entry = { type: typeRow[col], sector: sectorRow[col] };
        columnMapping[col] = entry;
        columns[col - 2] = entry;
      }
    }

    targetObject._columns = columns;
    targetObject._provinceRows = []; // [{code, name, normalizedName}]

    for (let row = 6; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData || rowData.length < 2) continue;

      const provinceCode = rowData[0];
      const provinceName = rowData[1];
      if (!provinceCode || !provinceName) continue;

      const normalizedProvinceName = provinceName.toLowerCase().replace(/-/g, '');

      targetObject._provinceRows.push({ code: provinceCode, name: provinceName, normalizedName: normalizedProvinceName });

      if (!targetObject[normalizedProvinceName]) {
        targetObject[normalizedProvinceName] = {};
      }

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

  // ========================
  // Municipal query methods
  // ========================

  /**
   * Query municipal data
   */
  queryMunicipal(params) {
    const { scenario, year, carrier, metricType, gmCode, type, sector } = params;

    if (!this.loaded) {
      console.warn('Data not loaded yet. Call loadAllData() first.');
      return 'ERROR - data not available';
    }

    if (!scenario || !year || !carrier || !metricType || !gmCode || !type || !sector) {
      console.warn('Missing required parameters:', params);
      return 'ERROR - data not available';
    }

    try {
      const value = this.municipalData[scenario]?.[year]?.[carrier]?.[metricType]?.[gmCode]?.[type]?.[sector];
      if (value === null || value === undefined) {
        return 'ERROR - data not available';
      }
      return value;
    } catch (error) {
      console.error('Error querying municipal data:', error);
      return 'ERROR - data not available';
    }
  }

  /**
   * Query provincial data
   */
  queryProvincial(params) {
    const { scenario, year, carrier, metricType, province, type, sector } = params;

    if (!this.loaded) {
      return 'ERROR - data not loaded yet';
    }

    try {
      const value = this.provincialData[scenario]?.[year]?.[carrier]?.[metricType]?.[province]?.[type]?.[sector];
      if (value === undefined || value === null || value === '') {
        return 'ERROR - data not available';
      }

      const parsedValue = typeof value === 'string'
        ? parseFloat(value.replace(/,/g, ''))
        : value;

      return isNaN(parsedValue) ? 'ERROR - data not available' : parsedValue;
    } catch (error) {
      console.error('Error querying provincial data:', error);
      return 'ERROR - data not available';
    }
  }

  // ========================
  // Accessor methods
  // ========================

  getScenarios() {
    return this.scenarios;
  }

  isImportedScenario(scenario) {
    return !this.defaultScenarios.has(scenario);
  }

  hasCarrierData(scenario, carrier) {
    function hasNonZero(obj) {
      if (obj === null || obj === undefined) return false;
      if (typeof obj === 'number') return Math.abs(obj) > 1e-9;
      if (typeof obj === 'string') { const n = parseFloat(obj.replace(/,/g, '')); return !isNaN(n) && Math.abs(n) > 1e-9; }
      if (typeof obj === 'object') { for (const k in obj) { if (hasNonZero(obj[k])) return true; } }
      return false;
    }
    const scenarioMunicipal = this.municipalData[scenario];
    const scenarioProvincial = this.provincialData[scenario];
    if (!scenarioMunicipal && !scenarioProvincial) return false;
    for (const year in (scenarioMunicipal || {})) {
      if (hasNonZero(scenarioMunicipal[year]?.[carrier])) return true;
    }
    for (const year in (scenarioProvincial || {})) {
      if (hasNonZero(scenarioProvincial[year]?.[carrier])) return true;
    }
    return false;
  }

  getYears(scenario) {
    return this.years[scenario] || [];
  }

  getCarriers() {
    return Object.keys(this.municipalSheetNames);
  }

  getMetricTypes() {
    return ['capacity', 'volume'];
  }

  getSectorsForCarrierAndType(carrier, type) {
    if (!this.loaded) return [];

    const sectors = new Set();

    try {
      for (const scenario in this.provincialData) {
        for (const year in this.provincialData[scenario]) {
          const carrierData = this.provincialData[scenario][year][carrier];
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

  getTypesForCarrier(carrier) {
    if (!this.loaded) return [];

    const types = new Set();

    try {
      for (const scenario in this.provincialData) {
        for (const year in this.provincialData[scenario]) {
          const carrierData = this.provincialData[scenario][year][carrier];
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

  calculateTotal(params) {
    const provinces = [
      'groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland',
      'gelderland', 'utrecht', 'noordholland', 'zuidholland',
      'zeeland', 'noordbrabant', 'limburg'
    ];

    let total = 0;
    let hasData = false;

    provinces.forEach(province => {
      const value = this.queryProvincial({ ...params, province });
      if (value !== 'ERROR - data not available' && !isNaN(parseFloat(value))) {
        total += Math.abs(parseFloat(value));
        hasData = true;
      }
    });

    return hasData ? total : null;
  }

  // ========================
  // Import from ZIP
  // ========================

  /**
   * Parse scenario name and year from a filename.
   * Expected format: "<scenarioname> <year>.xlsx"
   * e.g. "Scenario KM PEH reg WOZ en kern 6 2050.xlsx"
   * The year is the last number before .xlsx, everything before it is the scenario name.
   */
  parseFilename(filename) {
    // Remove path separators and get just the filename
    const basename = filename.replace(/^.*[\\/]/, '');
    const match = basename.match(/^(.+?)\s+(\d{4})\.xlsx$/i);
    if (!match) return null;
    return { scenario: match[1].trim(), year: parseInt(match[2], 10) };
  }

  /**
   * Import scenarios from a ZIP file (ArrayBuffer).
   * @param {ArrayBuffer} zipBuffer - The ZIP file contents
   * @param {string} mode - 'append' or 'replace'
   * @param {string|null} password - Password for encrypted ZIPs (null if unencrypted)
   * @param {Function|null} onProgress - Optional callback(message) for progress updates
   * @param {string[]|null} selectedScenarios - If provided, only import these scenarios
   * @returns {Promise<{scenarios: string[], errors: string[], aandachtspunten: string|null}>}
   */
  async importFromZip(zipBuffer, mode, password, onProgress, selectedScenarios) {
    let zip;
    try {
      if (password) {
        // Try loading with password using fflate
        const uint8 = new Uint8Array(zipBuffer);
        const decompressed = fflate.unzipSync(uint8, { password: new TextEncoder().encode(password) });
        zip = new JSZip();
        for (const [name, data] of Object.entries(decompressed)) {
          zip.file(name, data);
        }
      } else {
        zip = await JSZip.loadAsync(zipBuffer);
      }
    } catch (e) {
      throw new Error('Kan ZIP-bestand niet openen: ' + e.message);
    }

    // Check for aandachtspunten.txt
    let aandachtspunten = null;
    const aandachtspuntenEntry = zip.file(/aandachtspunten\.txt$/i)[0];
    if (aandachtspuntenEntry) {
      try {
        aandachtspunten = await aandachtspuntenEntry.async('string');
      } catch (e) {
        console.warn('Could not read aandachtspunten.txt:', e);
      }
    }

    // Collect xlsx files and parse their scenario/year
    const files = {};
    const skippedFiles = [];
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (!relativePath.toLowerCase().endsWith('.xlsx')) return;
      // Skip macOS resource fork files
      if (relativePath.startsWith('__MACOSX')) return;
      const parsed = this.parseFilename(relativePath);
      if (parsed) {
        if (!files[parsed.scenario]) files[parsed.scenario] = {};
        files[parsed.scenario][parsed.year] = zipEntry;
      } else {
        skippedFiles.push(relativePath);
      }
    });

    if (skippedFiles.length > 0) {
      console.warn('Skipped files (no matching pattern):', skippedFiles);
    }

    // Filter by selected scenarios if provided
    if (selectedScenarios && selectedScenarios.length > 0) {
      for (const key of Object.keys(files)) {
        if (!selectedScenarios.includes(key)) {
          delete files[key];
        }
      }
    }

    const importedScenarios = Object.keys(files);
    if (importedScenarios.length === 0) {
      throw new Error('Geen scenario\'s geselecteerd om te importeren.');
    }

    // If replace mode, clear existing data
    if (mode === 'replace') {
      this.scenarios = [];
      this.years = {};
      this.municipalData = {};
      this.provincialData = {};
    }

    const errors = [];
    let totalFiles = 0;
    for (const s of importedScenarios) totalFiles += Object.keys(files[s]).length;
    let processedFiles = 0;

    for (const scenario of importedScenarios) {
      // Add scenario if not already present
      if (!this.scenarios.includes(scenario)) {
        this.scenarios.push(scenario);
      }
      if (!this.years[scenario]) {
        this.years[scenario] = [];
      }

      const yearEntries = files[scenario];
      for (const yearStr of Object.keys(yearEntries).sort()) {
        const year = parseInt(yearStr, 10);
        const zipEntry = yearEntries[yearStr];

        if (!this.years[scenario].includes(year)) {
          this.years[scenario].push(year);
          this.years[scenario].sort((a, b) => a - b);
        }

        try {
          processedFiles++;
          if (onProgress) onProgress(`Bestand ${processedFiles}/${totalFiles}: ${scenario} ${year}...`);
          // Yield to allow UI updates between files
          await new Promise(resolve => setTimeout(resolve, 10));
          const uint8arr = await zipEntry.async('uint8array');
          const workbook = XLSX.read(uint8arr);

          // Initialize data structures
          if (!this.municipalData[scenario]) this.municipalData[scenario] = {};
          if (!this.municipalData[scenario][year]) this.municipalData[scenario][year] = {};
          if (!this.provincialData[scenario]) this.provincialData[scenario] = {};
          if (!this.provincialData[scenario][year]) this.provincialData[scenario][year] = {};

          const carriers = ['ELEC', 'H2', 'METH'];
          const metricTypes = ['capacity', 'volume'];

          for (const carrier of carriers) {
            if (!this.municipalData[scenario][year][carrier]) {
              this.municipalData[scenario][year][carrier] = {};
            }

            for (const metricType of metricTypes) {
              // Parse municipal sheet
              const municipalSheetName = this.municipalSheetNames[carrier][metricType];
              const municipalSheet = workbook.Sheets[municipalSheetName];
              if (municipalSheet) {
                this.municipalData[scenario][year][carrier][metricType] = this.parseMunicipalSheet(municipalSheet);
              }

              // Parse provincial sheet
              const provincialSheetName = this.provincialSheetNames[carrier][metricType];
              const provincialSheet = workbook.Sheets[provincialSheetName];
              if (provincialSheet) {
                if (!this.provincialData[scenario][year][carrier]) {
                  this.provincialData[scenario][year][carrier] = {};
                }
                if (!this.provincialData[scenario][year][carrier][metricType]) {
                  this.provincialData[scenario][year][carrier][metricType] = {};
                }
                const jsonData = XLSX.utils.sheet_to_json(provincialSheet, { header: 1 });
                this.parseProvincialSheetData(jsonData, this.provincialData[scenario][year][carrier][metricType]);
              }
            }
          }
        } catch (err) {
          errors.push(`${scenario} ${year}: ${err.message}`);
        }
      }
    }

    return { scenarios: importedScenarios, errors, aandachtspunten };
  }

  /**
   * Scan a ZIP buffer and return the scenario names found in it.
   * @param {JSZip} zip - Already loaded JSZip instance
   * @returns {string[]} Sorted list of scenario names
   */
  scanZipScenarios(zip) {
    const scenarios = new Set();
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (!relativePath.toLowerCase().endsWith('.xlsx')) return;
      if (relativePath.startsWith('__MACOSX')) return;
      const parsed = this.parseFilename(relativePath);
      if (parsed) scenarios.add(parsed.scenario);
    });
    return Array.from(scenarios).sort();
  }

  /**
   * Check if a ZIP buffer appears to be encrypted.
   * Encrypted ZIP entries have bit 0 of the general purpose flag set.
   */
  static isZipEncrypted(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    const len = buffer.byteLength;

    while (offset + 30 <= len) {
      // Look for local file header signature: PK\x03\x04
      if (view.getUint32(offset, true) !== 0x04034b50) break;
      const flags = view.getUint16(offset + 6, true);
      if (flags & 0x01) return true; // Encryption bit set
      // Skip to next entry
      const compressedSize = view.getUint32(offset + 18, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      offset += 30 + nameLen + extraLen + compressedSize;
    }
    return false;
  }
}

// Create global instances that proxy to the unified loader for backward compatibility
const dataLoader = new DataLoader();

// Backward-compatible wrappers
const municipalDataLoader = {
  get loaded() { return dataLoader.loaded; },
  loadAllData: () => dataLoader.loadAllData(),
  query: (params) => dataLoader.queryMunicipal(params),
  getScenarios: () => dataLoader.getScenarios(),
  getYears: (scenario) => dataLoader.getYears(scenario),
  getCarriers: () => dataLoader.getCarriers(),
  getMetricTypes: () => dataLoader.getMetricTypes()
};

const provincialDataLoader = {
  get loaded() { return dataLoader.loaded; },
  loadAllData: () => dataLoader.loadAllData(),
  query: (params) => dataLoader.queryProvincial(params),
  getSectorsForCarrierAndType: (carrier, type) => dataLoader.getSectorsForCarrierAndType(carrier, type),
  getTypesForCarrier: (carrier) => dataLoader.getTypesForCarrier(carrier),
  calculateTotal: (params) => dataLoader.calculateTotal(params)
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
