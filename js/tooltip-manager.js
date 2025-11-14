// Tooltip Manager
// Loads and manages tooltips from the toelichting CSV file

class TooltipManager {
  constructor() {
    this.tooltipData = [];
    this.loaded = false;
  }

  // Load the CSV file
  async loadTooltips() {
    try {
      const response = await fetch('data/toelichting_categorieen.csv');
      const csvText = await response.text();
      this.parseCSV(csvText);
      this.loaded = true;
      console.log('Tooltip data loaded:', this.tooltipData.length, 'entries');
    } catch (error) {
      console.error('Error loading tooltip data:', error);
    }
  }

  // Parse CSV text into data structure
  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    // Parse each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by comma, but handle commas within quotes
      const values = this.parseCSVLine(line);
      
      if (values.length >= 6) {
        this.tooltipData.push({
          carrier: values[0].trim(),
          type: values[1].trim(),
          sector: values[2].trim(),
          id: values[3].trim(),
          definition: values[4].trim(),
          method: values[5].trim()
        });
      }
    }
  }

  // Parse a CSV line handling commas within quotes
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result;
  }

  // Normalize carrier name for matching
  normalizeCarrier(carrier) {
    const carrierMap = {
      'ELEC': 'Electricity',
      'Electricity': 'Electricity',
      'H2': 'Hydrogen',
      'Hydrogen': 'Hydrogen',
      'METH': 'Methane',
      'Methane': 'Methane'
    };
    return carrierMap[carrier] || carrier;
  }

  // Normalize type name for matching
  normalizeType(type) {
    // Map the button type names to CSV type names
    const typeMap = {
      'Demand': 'Demand',
      'Supply': 'Supply',
      'Flexibility': 'Flexibility',
      'Exchange': 'Exchange',
      'Industrial Demand': 'Demand'
    };
    return typeMap[type] || type;
  }

  // Normalize sector name for matching
  normalizeSector(sector) {
    // Remove underscores and convert to lowercase for matching
    const normalized = sector.replace(/_/g, ' ').toLowerCase().trim();
    
    // Map common variations
    const sectorMap = {
      'huishoudens': 'Households',
      'households': 'Households',
      'gebouwen': 'Buildings',
      'buildings': 'Buildings',
      'landbouw': 'Agriculture',
      'agriculture': 'Agriculture',
      'datacenters': 'Datacenters',
      'datacenter': 'Datacenters',
      'industrie': 'Industry',
      'industry': 'Industry',
      'transport': 'Transport',
      'warmtenetten': 'District heating',
      'district heating': 'District heating',
      'hernieuwbaar': 'Renewables',
      'renewables': 'Renewables',
      'centrales': 'Power plants',
      'power plants': 'Power plants',
      'power to gas': 'Power-to-gas',
      'power-to-gas': 'Power-to-gas',
      'power to heat': 'Power-to-heat',
      'power-to-heat': 'Power-to-heat',
      'elektriciteit opslag': 'Electricity storage',
      'electricity storage': 'Electricity storage',
      'curtailment': 'Curtailment',
      'deficit': 'Deficit',
      'waterstof aanbod': 'Hydrogen supply',
      'hydrogen supply': 'Hydrogen supply',
      'flexibel waterstof aanbod': 'Flexible hydrogen supply',
      'flexible hydrogen supply': 'Flexible hydrogen supply',
      'waterstof opslag': 'Hydrogen storage',
      'hydrogen storage': 'Hydrogen storage',
      'uitwisseling': 'Exchange',
      'exchange': 'Exchange',
      'methaan aanbod': 'Methane supply',
      'methane supply': 'Methane supply',
      'methaan opslag': 'Methane storage',
      'methane storage': 'Methane storage',
      'other demand': 'Other demand',
      'overige vraag': 'Other demand'
    };
    
    return sectorMap[normalized] || sector;
  }

  // Get tooltip for a specific sector button
  getTooltip(carrier, type, sector) {
    if (!this.loaded) return null;
    
    const normalizedCarrier = this.normalizeCarrier(carrier);
    const normalizedType = this.normalizeType(type);
    
    // Special handling for buttons that should show multiple ID entries
    const specialCases = {
      'transport_plane': ['Transport_plane_national', 'Transport_plane_international'],
      'Transport_plane': ['Transport_plane_national', 'Transport_plane_international'],
      'transport_ship': ['Transport_ship_national', 'Transport_ship_international'],
      'Transport_ship': ['Transport_ship_national', 'Transport_ship_international']
    };
    
    let matches = [];
    
    // Check if this is a special case button
    if (specialCases[sector]) {
      const idsToMatch = specialCases[sector];
      matches = this.tooltipData.filter(item => {
        return item.carrier === normalizedCarrier &&
               item.type === normalizedType &&
               idsToMatch.includes(item.id);
      });
    } else {
      // Priority 1: Exact ID match (e.g., "Households_hp_electric" matches ID "Households_hp_electric")
      matches = this.tooltipData.filter(item => {
        return item.carrier === normalizedCarrier &&
               item.type === normalizedType &&
               item.id === sector;
      });
    }
    
    // Priority 2: If no exact ID match, try matching by sector category
    if (matches.length === 0) {
      const normalizedSector = this.normalizeSector(sector);
      matches = this.tooltipData.filter(item => {
        return item.carrier === normalizedCarrier &&
               item.type === normalizedType &&
               item.sector === normalizedSector;
      });
    }
    
    // Priority 3: Try matching base sector (e.g., "Households" from "Households_hp_electric")
    if (matches.length === 0 && sector.includes('_')) {
      const sectorBase = sector.split('_')[0];
      matches = this.tooltipData.filter(item => {
        return item.carrier === normalizedCarrier &&
               item.type === normalizedType &&
               (item.id === sectorBase || item.id === sector);
      });
    }
    
    if (matches.length === 0) return null;
    
    // Build tooltip HTML from all matching entries
    let tooltipHTML = '';
    matches.forEach((match, index) => {
      if (index > 0) tooltipHTML += '<hr style="margin: 8px 0; border-color: rgba(255,255,255,0.3);">';
      
      if (match.definition) {
        tooltipHTML += `<div style="margin-bottom: 4px;"><strong>Definitie:</strong> ${match.definition}</div>`;
      }
      if (match.method && match.method !== 'Niet van toepassing') {
        tooltipHTML += `<div><strong>Methode/bron:</strong> ${match.method}</div>`;
      }
    });
    
    return tooltipHTML || null;
  }

  // Add tooltip to a button element using Bootstrap tooltip
  addTooltipToButton(button, carrier, type, sector) {
    const tooltipContent = this.getTooltip(carrier, type, sector);
    
    if (tooltipContent) {
      button.setAttribute('data-bs-toggle', 'tooltip');
      button.setAttribute('data-bs-placement', 'top');
      button.setAttribute('data-bs-html', 'true');
      button.setAttribute('title', tooltipContent);
      
      // Initialize Bootstrap tooltip
      if (typeof bootstrap !== 'undefined') {
        new bootstrap.Tooltip(button, {
          html: true,
          placement: 'top',
          trigger: 'hover',
          customClass: 'sector-tooltip'
        });
      }
    }
  }

  // Dispose all tooltips in a container (to prevent memory leaks when recreating buttons)
  disposeTooltipsInContainer(container) {
    if (typeof bootstrap === 'undefined') return;
    
    const tooltipElements = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipElements.forEach(element => {
      const tooltip = bootstrap.Tooltip.getInstance(element);
      if (tooltip) {
        tooltip.dispose();
      }
    });
  }
}

// Create global instance
const tooltipManager = new TooltipManager();

