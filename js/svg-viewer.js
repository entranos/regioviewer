/**
 * SVG Viewer - Simple display with hover tooltips
 * Loads SVG file into container and enables:
 * - Hover tooltips showing element attributes
 */

transportLabelVisibility = 'hidden'

// Global municipality lookup
let gmLookup = {};

// Global list of GM codes
const gmCodes = [
  "GM0114","GM1509","GM0262","GM0376","GM0093","GM0866","GM0299","GM0597","GM1901","GM0342",
  "GM0502","GM1621","GM0197","GM1659","GM1773","GM0627","GM1783","GM1969","GM0882","GM0482",
  "GM0277","GM0377","GM1586","GM0150","GM0275","GM0175","GM1734","GM0531","GM0888","GM0431",
  "GM0632","GM0355","GM0141","GM1641","GM1721","GM0797","GM1916","GM1978","GM1895","GM0086",
  "GM1948","GM1640","GM0173","GM0879","GM0293","GM0313","GM0798","GM1681","GM0703","GM0889",
  "GM0498","GM0553","GM0193","GM0303","GM0637","GM0310","GM0166","GM0984","GM1991","GM1674",
  "GM0294","GM0222","GM0736","GM1735","GM0753","GM0718","GM0899","GM0308","GM0852","GM0301",
  "GM0307","GM1740","GM1900","GM0450","GM0547","GM0983","GM0088","GM1896","GM0772","GM0037",
  "GM0225","GM0532","GM1655","GM1952","GM1979","GM0715","GM0613","GM0758","GM0848","GM0232",
  "GM0840","GM1696","GM1676","GM0312","GM0737","GM1942","GM1507","GM0405","GM0880","GM0873",
  "GM1719","GM0762","GM0748","GM0546","GM0059","GM0489","GM1695","GM0437","GM0935","GM1667",
  "GM0184","GM0168","GM0014","GM0542","GM0351","GM0213","GM0451","GM0034","GM0406","GM1700",
  "GM1730","GM0512","GM0233","GM0243","GM0503","GM0345","GM0385","GM0344","GM1525","GM1903",
  "GM0938","GM0096","GM0400","GM1709","GM0757","GM0397","GM0399","GM0109","GM1690","GM0824",
  "GM0296","GM0160","GM0765","GM0297","GM0851","GM0072","GM0200","GM1891","GM0327","GM0273",
  "GM0394","GM0867","GM0796","GM0626","GM0214","GM0246","GM0228","GM0453","GM0396","GM0687",
  "GM0362","GM0203","GM0855","GM0221","GM0439","GM1992","GM0668","GM0373","GM0590","GM0352",
  "GM1884","GM1970","GM0080","GM0716","GM0537","GM0388","GM1742","GM0263","GM0392","GM1924",
  "GM0858","GM1714","GM1708","GM0820","GM0513","GM1955","GM1711","GM0158","GM0981","GM1652",
  "GM1669","GM1729","GM1961","GM1774","GM0085","GM0090","GM1876","GM0448","GM1940","GM1963",
  "GM0209","GM0340","GM1658","GM0321","GM0268","GM0060","GM0944","GM0420","GM0202","GM0777",
  "GM1723","GM1724","GM1930","GM0744","GM1954","GM0845","GM0164","GM1883","GM0180","GM0279",
  "GM0147","GM0331","GM0865","GM1959","GM0153","GM0523","GM0106","GM0603","GM0642","GM0473",
  "GM0383","GM0717","GM0677","GM0267","GM0432","GM0917","GM1706","GM0893","GM0074","GM0484",
  "GM0479","GM0415","GM0556","GM0678","GM0599","GM0638","GM0363","GM0534","GM0226","GM0847",
  "GM0784","GM0988","GM1699","GM1945","GM1911","GM0589","GM0965","GM0361","GM0353","GM0785",
  "GM0274","GM0505","GM0047","GM1581","GM1680","GM0995","GM1842","GM0281","GM0610","GM1904",
  "GM0809","GM0622","GM1949","GM0317","GM0794","GM0285","GM0755","GM0946","GM1926","GM0417",
  "GM1950","GM1705","GM0518","GM0986","GM0743","GM1701","GM0664","GM0971","GM0770","GM0606",
  "GM0994","GM0244","GM0230","GM1980","GM1931","GM0861","GM1728","GM0289","GM1894","GM1892",
  "GM0441","GM0826","GM1598","GM0216","GM0302","GM1982","GM0828","GM0907","GM0358","GM0823",
  "GM0339","GM0579","GM0119","GM0384","GM0177","GM0629","GM0402","GM0269","GM0335","GM0957",
  "GM0252","GM1859","GM0050","GM0779","GM0654","GM0375","GM0148","GM1960","GM0171","GM0575",
  "GM0118","GM0356","GM0189","GM0928","GM1966","GM1731","GM1771","GM0098","GM0163","GM0569",
  "GM0183","GM0766"
];

// Global storage for original GM positions (for clustering/restoring)
const originalGMPositions = {};

// Global data visualization state
const dataVisualizationState = {
  scenario: 'Eigen Vermogen',
  year: 2030,
  carrier: 'ELEC',
  metricType: 'volume',
  type: 'Demand',
  sector: 'Households',
  isActive: false,
  minRadius: 0,
  maxRadius: 140,
  defaultRadius: 5,
  // Global max values for consistent scaling
  globalMaxVolume: null,  // TWh - calculated from all data
  globalMaxCapacity: null, // MW - calculated from all data
  // Carrier colors
  carrierColors: {
    'ELEC': '#c99d45',  // Electricity - yellow/gold
    'H2': '#7555f6',    // Hydrogen - purple
    'METH': '#3f88ae'   // Methane - blue
  }
};

class SVGViewer {
  constructor(containerId, svgPath) {
    this.container = document.getElementById(containerId);
    this.svgPath = svgPath;
    this.svg = null;
    this.viewBox = { x: 0, y: 0, width: 2000, height: 2000 };
    this.tooltip = null;
    this.ready = null; // Promise that resolves when SVG is loaded

    this.ready = this.init();
  }

  /**
   * Initialize the SVG viewer
   */
  async init() {
    try {
      // Fetch and load the SVG
      await this.loadSVG();

      // Set up event listeners
      this.setupEventListeners();

      // console.log('SVG Viewer initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing SVG Viewer:', error);
      throw error;
    }
  }

  /**
   * Load SVG file and insert into container
   */
  async loadSVG() {
    try {
      // Add timestamp to prevent caching
      const url = this.svgPath + '?t=' + Date.now();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.statusText}`);
      }

      let svgText = await response.text();

      // Remove inline styles from paths to allow CSS to control them
      svgText = svgText.replace(/style="[^"]*"/g, '');

      this.container.innerHTML = svgText;

      // Get the SVG element
      this.svg = this.container.querySelector('svg');

      if (!this.svg) {
        throw new Error('SVG element not found in loaded content');
      }

      // Set up the SVG container
      this.setupSVGContainer();

      // console.log('SVG loaded successfully');
    } catch (error) {
      console.error('Error loading SVG:', error);
      this.container.innerHTML = `<p style="color: red; padding: 20px;">Error loading SVG: ${error.message}</p>`;
    }
  }

  /**
   * Set up the SVG container with proper styling
   */
  setupSVGContainer() {
    // Remove fixed width/height and let CSS control sizing
    this.svg.removeAttribute('width');
    this.svg.removeAttribute('height');

    // Add CSS classes to SVG for styling
    this.svg.setAttribute('class', 'svg-content');
    this.svg.style.cursor = 'default';
    this.svg.style.userSelect = 'none';

    // Store original viewBox
    const viewBox = this.svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/);
      this.viewBox = {
        x: parseFloat(parts[0]) || 0,
        y: parseFloat(parts[1]) || 0,
        width: parseFloat(parts[2]) || 2000,
        height: parseFloat(parts[3]) || 2000
      };
    }

    // console.log('SVG ViewBox:', this.viewBox);
  }

  /**
   * Set up event listeners for tooltips
   */
  setupEventListeners() {
    // Create tooltip element
    this.createTooltip();

    // Throttle mousemove to prevent performance issues
    // This prevents the map from slowing down other parts of the page (like the sankey diagram)
    let mouseMoveTimer = null;
    const throttledMouseMove = (e) => {
      if (mouseMoveTimer) return;
      mouseMoveTimer = setTimeout(() => {
        this.handleSVGMouseMove(e);
        mouseMoveTimer = null;
      }, 50); // 20fps - fast enough for smooth tooltips, slow enough to not impact performance
    };

    // Mouse move for tooltip (throttled)
    this.svg.addEventListener('mousemove', throttledMouseMove, { passive: true });

    // Mouse leave to hide tooltip
    this.svg.addEventListener('mouseleave', () => this.hideTooltip());
    
    // Click handler for GM circles
    this.svg.addEventListener('click', (e) => this.handleSVGClick(e));
  }

  /**
   * Handle SVG click for popup
   */
  handleSVGClick(e) {
    const element = e.target;
    if (element.id && element.id.endsWith('_point')) {
      // Check if it's a province reference point
      if (element.id.startsWith('province_reference_point_')) {
        const refNum = element.id.match(/province_reference_point_(\d+)_point/)[1];
        
        // Find province name from reference number
        const provinceMap = {
          '1': 'noordholland', '2': 'flevoland', '3': 'overijssel', '4': 'drenthe',
          '5': 'groningen', '6': 'friesland', '7': 'gelderland', '8': 'utrecht',
          '9': 'zuidholland', '10': 'noordbrabant', '11': 'limburg', '12': 'zeeland'
        };
        const provinceDisplayMap = {
          'noordholland': 'Noord-Holland', 'flevoland': 'Flevoland', 'overijssel': 'Overijssel',
          'drenthe': 'Drenthe', 'groningen': 'Groningen', 'friesland': 'Friesland',
          'gelderland': 'Gelderland', 'utrecht': 'Utrecht', 'zuidholland': 'Zuid-Holland',
          'noordbrabant': 'Noord-Brabant', 'limburg': 'Limburg', 'zeeland': 'Zeeland'
        };
        
        const provinceName = provinceMap[refNum];
        const provinceDisplayName = provinceDisplayMap[provinceName] || provinceName;
        
        // Show popup for province data (industrial demand)
        if (dataVisualizationState.isActive && provincialDataLoader && provincialDataLoader.loaded) {
          showProvincePopup(provinceName, provinceDisplayName);
        }
      } else {
        // It's a GM circle
        const gmCode = element.id.replace('_point', '');
        const municipalityName = gmLookup[gmCode] || gmCode;
        
        // Only show popup if data visualization is active
        if (dataVisualizationState.isActive && municipalDataLoader && municipalDataLoader.loaded) {
          showMunicipalityPopup(gmCode, municipalityName);
        }
      }
    }
  }

  /**
   * Handle SVG mouse move for tooltips
   */
  handleSVGMouseMove(e) {
    const element = e.target;
    if (element.id) {
      let tooltipText = element.id;
      
      // Check if this is a municipality point
      if (element.id.endsWith('_point')) {
        const gmCode = element.id.replace('_point', '');
        const municipalityName = gmLookup[gmCode] || gmCode;
        
        // If data visualization is active, show data value
        if (dataVisualizationState.isActive && municipalDataLoader && municipalDataLoader.loaded) {
          const value = municipalDataLoader.query({
            scenario: dataVisualizationState.scenario,
            year: dataVisualizationState.year,
            carrier: dataVisualizationState.carrier,
            metricType: dataVisualizationState.metricType,
            gmCode: gmCode,
            type: dataVisualizationState.type,
            sector: dataVisualizationState.sector
          });
          
          const sectorName = dataVisualizationState.sector.replace(/_/g, ' ');
          
          if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
            const formatted = formatValueWithUnit(parseFloat(value), dataVisualizationState.metricType);
            tooltipText = `<strong>${municipalityName}</strong><br/>${sectorName}<br/><strong>${formatted.formatted}</strong> (${dataVisualizationState.year})`;
          } else {
            tooltipText = `<strong>${municipalityName}</strong><br/>No data available`;
          }
        } else {
          tooltipText = municipalityName;
        }
      }
      
      this.showTooltip(e.clientX, e.clientY, tooltipText);
    } else {
      this.hideTooltip();
    }
  }

  /**
   * Create tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: fixed;
      background-color: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      display: none;
      max-width: 200px;
      z-index: 10000;
      word-wrap: break-word;
    `;
    document.body.appendChild(this.tooltip);
  }

  /**
   * Show tooltip with element info
   */
  showTooltip(x, y, elementId) {
    if (!this.tooltip) return;

    this.tooltip.innerHTML = elementId;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 10) + 'px';
    this.tooltip.style.top = (y + 10) + 'px';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  /**
   * Hide all reference point elements (elements with id starting with 'reference_point_')
   */
  hideReferencePoints() {
    if (!this.svg) return;
    
    // Select all elements in the SVG
    const allElements = this.svg.querySelectorAll('[id]');
    let hiddenCount = 0;
    
    allElements.forEach(element => {
      if (element.id.startsWith('reference_point_')) {
        element.style.display = 'none';
        hiddenCount++;
      }
    });
    
    // console.log(`Hidden ${hiddenCount} reference point element(s)`);
    return hiddenCount;
  }

  /**
   * Show all reference point elements (elements with id starting with 'reference_point_')
   */
  showReferencePoints() {
    if (!this.svg) return;
    
    // Select all elements in the SVG
    const allElements = this.svg.querySelectorAll('[id]');
    let shownCount = 0;
    
    allElements.forEach(element => {
      if (element.id.startsWith('reference_point_')) {
        element.style.display = '';
        shownCount++;
      }
    });
    
    // console.log(`Shown ${shownCount} reference point element(s)`);
    return shownCount;
  }
}

// ===== Municipality Popup with Line Chart =====

function showMunicipalityPopup(gmCode, municipalityName) {
  // Remove existing popup if any
  const existingPopup = document.getElementById('municipalityPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'municipalityPopup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 10001;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'municipalityPopupOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10000;
  `;
  
  // Close popup when clicking overlay
  overlay.onclick = () => closeMunicipalityPopup();
  
  // Get data for all years
  const yearsData = collectMunicipalityDataOverYears(gmCode);
  
  // Build popup content
  const carrierNames = { 'ELEC': 'Electricity', 'H2': 'Hydrogen', 'METH': 'Methane' };
  const carrierName = carrierNames[dataVisualizationState.carrier] || dataVisualizationState.carrier;
  const sectorName = dataVisualizationState.sector.replace(/_/g, ' ');
  const typeName = dataVisualizationState.type;
  
  popup.innerHTML = `
    <div style="padding: 24px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #333;">${municipalityName}</h2>
          <p style="margin: 0; font-size: 14px; color: #666;">${carrierName} &bull; ${sectorName} &bull; ${typeName}</p>
        </div>
        <button onclick="closeMunicipalityPopup()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; padding: 0; width: 32px; height: 32px;">&times;</button>
      </div>
    </div>
    <div style="padding: 24px; flex: 1; overflow-y: auto;">
      <div id="municipalityChart" style="width: 100%; height: 300px;"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // Draw the chart
  drawMunicipalityLineChart(yearsData);
}

function collectMunicipalityDataOverYears(gmCode) {
  const scenarios = ['Eigen Vermogen', 'Gezamenlijke Balans', 'Horizon Aanvoer', 'Koersvaste Middenweg'];
  const years = [2025, 2030, 2035, 2040, 2050];
  const scenarioData = {};
  
  scenarios.forEach(scenario => {
    const data = [];
    years.forEach(year => {
      const value = municipalDataLoader.query({
        scenario: scenario,
        year: year,
        carrier: dataVisualizationState.carrier,
        metricType: dataVisualizationState.metricType,
        gmCode: gmCode,
        type: dataVisualizationState.type,
        sector: dataVisualizationState.sector
      });
      
      if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
        data.push({ year: year, value: Math.abs(parseFloat(value)) });
      }
    });
    if (data.length > 0) {
      scenarioData[scenario] = data;
    }
  });
  
  return scenarioData;
}

function collectProvinceDataOverYears(provinceName) {
  const scenarios = ['Eigen Vermogen', 'Gezamenlijke Balans', 'Horizon Aanvoer', 'Koersvaste Middenweg'];
  const years = [2025, 2030, 2035, 2040, 2050];
  const scenarioData = {};
  
  scenarios.forEach(scenario => {
    const data = [];
    years.forEach(year => {
      const value = provincialDataLoader.query({
        scenario: scenario,
        year: year,
        carrier: dataVisualizationState.carrier,
        metricType: dataVisualizationState.metricType,
        province: provinceName,
        type: 'Demand',
        sector: dataVisualizationState.sector
      });
      
      if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
        data.push({ year: year, value: Math.abs(parseFloat(value)) });
      }
    });
    if (data.length > 0) {
      scenarioData[scenario] = data;
    }
  });
  
  return scenarioData;
}

function drawMunicipalityLineChart(scenarioData) {
  const chartContainer = document.getElementById('municipalityChart');
  if (!chartContainer || Object.keys(scenarioData).length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">No data available for the selected years</p>';
    return;
  }
  
  // Convert data values for all scenarios
  const metricType = dataVisualizationState.metricType;
  const convertedScenarioData = {};
  let globalMaxValue = 0;
  
  // Convert all scenarios and find global max
  Object.keys(scenarioData).forEach(scenario => {
    convertedScenarioData[scenario] = scenarioData[scenario].map(d => ({
      year: d.year,
      value: metricType === 'volume' ? d.value / 1000000 : d.value
    }));
    const localMax = d3.max(convertedScenarioData[scenario], d => Math.abs(d.value));
    if (localMax > globalMaxValue) globalMaxValue = localMax;
  });
  
  // Determine unit from global settings and convert values
  let unit;
  if (metricType === 'volume') {
    // Use global unit setting for volume
    const userUnit = window.globalDisplayUnits ? window.globalDisplayUnits.volume : 'TWh';
    
    if (userUnit === 'PJ') {
      // Convert TWh to PJ (1 TWh = 3.6 PJ)
      Object.keys(convertedScenarioData).forEach(scenario => {
        convertedScenarioData[scenario].forEach(d => d.value = d.value * 3.6);
      });
      globalMaxValue *= 3.6;
      unit = 'PJ';
    } else {
      // Keep as TWh or convert to GWh for small values
      if (globalMaxValue >= 1) {
        unit = 'TWh';
      } else {
        // Convert all to GWh
        Object.keys(convertedScenarioData).forEach(scenario => {
          convertedScenarioData[scenario].forEach(d => d.value = d.value * 1000);
        });
        globalMaxValue *= 1000;
        unit = 'GWh';
      }
    }
  } else {
    // Capacity: use global unit setting
    const userUnit = window.globalDisplayUnits ? window.globalDisplayUnits.capacity : 'MW';
    
    if (userUnit === 'GW') {
      // Always show as GW
      Object.keys(convertedScenarioData).forEach(scenario => {
        convertedScenarioData[scenario].forEach(d => d.value = d.value / 1000);
      });
      globalMaxValue /= 1000;
      unit = 'GW';
    } else {
      unit = 'MW';
    }
  }
  
  // Scenario colors
  const scenarioColors = {
    'Eigen Vermogen': '#3498db',
    'Gezamenlijke Balans': '#e74c3c',
    'Horizon Aanvoer': '#2ecc71',
    'Koersvaste Middenweg': '#f39c12'
  };
  
  // Chart dimensions - increase right margin for legend
  const margin = { top: 20, right: 180, bottom: 40, left: 60 };
  const width = chartContainer.clientWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.select('#municipalityChart')
    .html('') // Clear previous content
    .append('svg')
    .attr('width', '100%')
    .attr('height', 300)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Scales
  const xScale = d3.scaleLinear()
    .domain([2025, 2050])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([0, globalMaxValue * 1.1])
    .range([height, 0]);
  
  // Add grid lines
  svg.append('g')
    .attr('class', 'grid')
    .attr('opacity', 0.1)
    .call(d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(''));
  
  // Add axes - show only specific years
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .tickValues([2025, 2030, 2035, 2040, 2050])
      .tickFormat(d3.format('d')))
    .style('font-size', '12px')
    .style('color', '#666');
  
  // Format Y-axis ticks as integers (data is already converted to the correct unit)
  const yTickFormat = (value) => {
    return Math.round(value).toString();
  };
  
  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(yTickFormat))
    .style('font-size', '12px')
    .style('color', '#666');
  
  // Add Y axis label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 10)
    .attr('x', -height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#666')
    .text(unit);
  
  // Line generator
  const line = d3.line()
    .defined(d => d.value != null && !isNaN(d.value))
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));
  
  // Draw lines and points for each scenario
  Object.keys(convertedScenarioData).forEach((scenario, index) => {
    const data = convertedScenarioData[scenario];
    const color = scenarioColors[scenario] || '#999';
    
    // Create a group for this scenario
    const scenarioGroup = svg.append('g')
      .attr('class', `scenario-${index}`);
    
    // Add the line with explicit styling
    scenarioGroup.append('path')
      .datum(data)
      .attr('class', 'scenario-line')
      .style('fill', 'none')
      .style('stroke', color)
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .style('stroke-linecap', 'round')
      .attr('d', line);
    
    // Add dots on top of the line
    scenarioGroup.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .style('fill', color)
      .style('stroke', 'white')
      .style('stroke-width', '2px');
  });
  
  // Add legend - position in top right outside plot area
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 10}, 0)`);
  
  Object.keys(convertedScenarioData).forEach((scenario, index) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${index * 20})`);
    
    legendRow.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', scenarioColors[scenario])
      .attr('stroke-width', 2);
    
    legendRow.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(scenario);
  });
}

function showProvincePopup(provinceName, provinceDisplayName) {
  // Remove existing popup if any
  const existingPopup = document.getElementById('municipalityPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'municipalityPopup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 10001;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'municipalityPopupOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10000;
  `;
  
  // Close popup when clicking overlay
  overlay.onclick = () => closeMunicipalityPopup();
  
  // Get data for all years
  const yearsData = collectProvinceDataOverYears(provinceName);
  
  // Build popup content
  const carrierNames = { 'ELEC': 'Electricity', 'H2': 'Hydrogen', 'METH': 'Methane' };
  const carrierName = carrierNames[dataVisualizationState.carrier] || dataVisualizationState.carrier;
  const sectorName = dataVisualizationState.sector.replace(/_/g, ' ');
  const typeName = 'Industrial Demand';
  
  popup.innerHTML = `
    <div style="padding: 24px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #333;">${provinceDisplayName}</h2>
          <p style="margin: 0; font-size: 14px; color: #666;">${carrierName} &bull; ${sectorName} &bull; ${typeName}</p>
        </div>
        <button onclick="closeMunicipalityPopup()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; padding: 0; width: 32px; height: 32px;">&times;</button>
      </div>
    </div>
    <div style="padding: 24px; flex: 1; overflow-y: auto;">
      <div id="municipalityChart" style="width: 100%; height: 300px;"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // Draw the chart
  drawMunicipalityLineChart(yearsData);
}

function closeMunicipalityPopup() {
  const popup = document.getElementById('municipalityPopup');
  const overlay = document.getElementById('municipalityPopupOverlay');
  if (popup) popup.remove();
  if (overlay) overlay.remove();
}

// Make close function globally accessible
window.closeMunicipalityPopup = closeMunicipalityPopup;

// Initialize the SVG viewer when the page loads
window.svgViewer = new SVGViewer('SVGContainer_kaart', './svg/export.svg');

// ===== Unit Formatting Helper =====
function formatValueWithUnit(value, metricType) {
  const absValue = Math.abs(value);
  
  if (metricType === 'volume') {
    // Volume is in MWh, convert to TWh (divide by 1,000,000)
    const twhValue = absValue / 1000000;
    
    if (twhValue >= 1000) {
      // Very large values: show as thousands of TWh
      return {
        value: twhValue,
        unit: 'TWh',
        formatted: (twhValue / 1000).toFixed(1) + 'k TWh'
      };
    } else if (twhValue >= 1) {
      // Show as TWh
      return {
        value: twhValue,
        unit: 'TWh',
        formatted: twhValue.toFixed(2) + ' TWh'
      };
    } else {
      // Less than 1 TWh: convert to GWh (multiply by 1000)
      const gwhValue = twhValue * 1000;
      return {
        value: gwhValue,
        unit: 'GWh',
        formatted: gwhValue.toFixed(0) + ' GWh'
      };
    }
  } else {
    // Capacity is in MW, convert to GW if >= 1000
    if (absValue >= 1000) {
      return {
        value: absValue / 1000,
        unit: 'GW',
        formatted: (absValue / 1000).toFixed(2) + ' GW'
      };
    } else {
      return {
        value: absValue,
        unit: 'MW',
        formatted: absValue.toFixed(0) + ' MW'
      };
    }
  }
}

// Helper to format already-converted values (values already in TWh or MW)
function formatConvertedValue(convertedValue, metricType) {
  const absValue = Math.abs(convertedValue);
  
  if (metricType === 'volume') {
    // Value is already in TWh
    // Check user's preferred unit
    if (window.globalDisplayUnits.volume === 'PJ') {
      // Convert TWh to PJ (1 TWh = 3.6 PJ)
      const pjValue = absValue * 3.6;
      if (pjValue >= 1000) {
        return (pjValue / 1000).toFixed(1) + 'k PJ';
      } else if (pjValue >= 1) {
        return pjValue.toFixed(2) + ' PJ';
      } else {
        // Less than 1 PJ: show as TJ
        const tjValue = pjValue * 1000;
        return tjValue.toFixed(0) + ' TJ';
      }
    } else {
      // Show as TWh (default)
      if (absValue >= 1000) {
        return (absValue / 1000).toFixed(1) + 'k TWh';
      } else if (absValue >= 1) {
        return absValue.toFixed(2) + ' TWh';
      } else {
        // Less than 1 TWh: show as GWh
        const gwhValue = absValue * 1000;
        return gwhValue.toFixed(0) + ' GWh';
      }
    }
  } else {
    // Capacity is in MW
    // Check user's preferred unit
    if (window.globalDisplayUnits.capacity === 'GW') {
      // Always show as GW
      const gwValue = absValue / 1000;
      return gwValue.toFixed(2) + ' GW';
    } else {
      // Show as MW (default)
      return absValue.toFixed(0) + ' MW';
    }
  }
}

// Function to show "zero total" label in center of map
function updateTopLeftTotal(totalValue) {
  const svg = d3.select('#SVGContainer_kaart svg');
  
  // Remove existing total display
  svg.selectAll('.top-left-total').remove();
  
  if (!dataVisualizationState.isActive || totalValue === undefined) {
    return;
  }
  
  // Get SVG dimensions
  const svgElement = svg.node();
  const bbox = svgElement.getBBox();
  
  // Format the value
  const formattedValue = formatConvertedValue(totalValue, dataVisualizationState.metricType);
  
  // Position in top left with spacing
  const padding = 24;
  const x = bbox.x + padding+50;
  const y = bbox.y + padding+80;
  
  // Create label group
  const labelGroup = svg.append('g')
    .attr('class', 'top-left-total')
    .style('opacity', 0);
  
  // Carrier names
  const carrierNames = { 'ELEC': 'Electricity', 'H2': 'Hydrogen', 'METH': 'Methane' };
  const carrierName = carrierNames[dataVisualizationState.carrier] || dataVisualizationState.carrier;
  
  // Metric type
  const metricName = dataVisualizationState.metricType === 'volume' ? 'Volume' : 'Capacity';
  
  // Build info lines
  const lines = [
    { label: 'Scenario', value: dataVisualizationState.scenario },
    { label: 'Versie', value: 'NBNL 2025 v1.0' },
    { label: 'Jaar', value: dataVisualizationState.year.toString() },
    { label: 'Drager', value: carrierName },
    { label: 'Categorie', value: dataVisualizationState.type },
    { label: 'Asset', value: dataVisualizationState.sector.replace(/_/g, ' ') },
    { label: 'Eenheid', value: metricName },
    { label: 'Totaal nationaal', value: formattedValue, isTotal: true }
  ];
  
  let currentY = y;
  const lineHeight = 50;
  const labelWidth = 40;
  
  labelGroup.append('text')
    .attr('x', x-87)
    .attr('y', y-lineHeight-10-20)
    .attr('text-anchor', 'start')
    .style('font-size', '29px')
    .style('font-weight', '400')
    .style('fill', '#222')
    .text(lines[5].value  + ' | ' + lines[3].value + ' | ' + lines[4].value )

    d3.select('#mapTitle').text(lines[0].value + ' | ' + lines[2].value)

  lines.forEach((line, index) => {

    // Add label
    labelGroup.append('text')
      .attr('x', x)
      .attr('y', currentY)
      .attr('text-anchor', 'end')
      .style('font-size', line.isTotal ? '20px' : '18px')
      .style('font-weight', line.isTotal ? '600' : '500')
      .style('fill', line.isTotal ? '#222' : '#777')
      .style('letter-spacing', '0.4px')
      .text(line.label);
    
    // Add value
    labelGroup.append('text')
      .attr('x', x + labelWidth)
      .attr('y', currentY)
      .attr('text-anchor', 'start')
      .style('font-size', line.isTotal ? '25px' : '20px')
      .style('font-weight', line.isTotal ? '700' : '400')
      .style('fill', line.isTotal ? '#000' : '#333')
      .text(line.value);
    
    currentY += lineHeight;
    
    // Add separator before total
    if (index === lines.length - 2) {
      currentY += 14;
    }
  });
  
  // Fade in and ensure it's on top
  labelGroup
    .raise() // Move to end of SVG to render on top
    .transition()
    .duration(300)
    .style('opacity', 1);
}

function showZeroTotalLabel() {
  const svg = d3.select('#SVGContainer_kaart svg');
  
  // Remove existing zero label
  svg.selectAll('.zero-total-label').remove();
  
  // Hide all province total labels
  updateProvinceTotalLabels({});
  
  // Get SVG dimensions
  const svgElement = svg.node();
  const bbox = svgElement.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;
  
  const metricType = dataVisualizationState.metricType;
  let unit;
  if (metricType === 'volume') {
    unit = window.globalDisplayUnits ? window.globalDisplayUnits.volume : 'TWh';
  } else {
    unit = window.globalDisplayUnits ? window.globalDisplayUnits.capacity : 'MW';
  }
  const labelText = `0 ${unit}`;
  
  // Create label group
  const labelGroup = svg.append('g')
    .attr('class', 'zero-total-label')
    .style('opacity', 0);
  
  // Add background rectangle
  labelGroup.append('rect')
    .attr('x', centerX - 60)
    .attr('y', centerY - 25)
    .attr('width', 120)
    .attr('height', 50)
    .attr('fill', 'white')
    .attr('stroke', '#999')
    .attr('stroke-width', 2)
    .attr('rx', 6)
    .attr('opacity', 0.95);
  
  // Add text
  labelGroup.append('text')
    .attr('x', centerX)
    .attr('y', centerY)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '24px')
    .style('font-weight', '600')
    .style('fill', '#666')
    .text(labelText);
  
  // Animate appearance and ensure it's on top
  labelGroup
    .raise() // Move to end of SVG to render on top
    .transition()
    .duration(400)
    .style('opacity', 1);
}

// Function to hide zero total label
function hideZeroTotalLabel() {
  const svg = d3.select('#SVGContainer_kaart svg');
  svg.selectAll('.zero-total-label')
    .transition()
    .duration(400)
    .style('opacity', 0)
    .remove();
}

// ===== Loading Progress Management =====
const loadingManager = {
  steps: [
    { name: 'svg', progress: 0, weight: 10 },
    { name: 'municipal', progress: 0, weight: 40 },
    { name: 'provincial', progress: 0, weight: 40 },
    { name: 'initialization', progress: 0, weight: 10 }
  ],
  
  updateProgress(stepName, progress) {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      step.progress = Math.min(100, Math.max(0, progress));
      this.updateUI();
    }
  },
  
  updateUI() {
    const totalProgress = this.steps.reduce((sum, step) => 
      sum + (step.progress * step.weight / 100), 0
    );
    
    const progressBar = document.getElementById('loading-progress-bar');
    const statusText = document.getElementById('loading-status');
    
    if (progressBar) {
      progressBar.style.width = totalProgress + '%';
    }
    
    if (statusText) {
      const currentStep = this.steps.find(s => s.progress > 0 && s.progress < 100);
      if (currentStep) {
        const statusMessages = {
          'svg': 'SVG map...',
          'municipal': 'Data gemeenten...',
          'provincial': 'Data provincies...',
          'initialization': 'Initialiseren...'
        };
        statusText.textContent = statusMessages[currentStep.name] || 'Laden...';
      } else if (totalProgress >= 100) {
        statusText.textContent = 'Gereed!';
      }
    }
  },
  
  complete() {
    this.steps.forEach(step => step.progress = 100);
    this.updateUI();
  }
};

// ===== Initialization Functions =====
function initializeSVGElements() {
  return new Promise((resolve) => {
    loadingManager.updateProgress('svg', 50);
    
    // Add fixed marker circles for province reference points
    const svgElement = d3.select('#SVGContainer_kaart svg');
    
    for (let i = 0; i < 12; i++) {
      const refPoint = d3.select('#province_reference_point_' + (i+1) + '_point');
      if (!refPoint.empty()) {
        const cx = refPoint.attr('cx');
        const cy = refPoint.attr('cy');
        
        // Append marker circle to SVG (will be on top)
        svgElement.append('circle')
          .attr('class', 'fixed-marker province-marker')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 3)
          .style('fill', 'white')
          .style('stroke', 'none')
          .style('opacity', 1)
          .style('pointer-events', 'none'); // Don't interfere with clicks
      }
    }
    
    // Add fixed marker circles for all GM points
    gmCodes.forEach(gmCode => {
      const gmPoint = d3.select('#' + gmCode + '_point');
      if (!gmPoint.empty()) {
        const cx = gmPoint.attr('cx');
        const cy = gmPoint.attr('cy');
        
        // Append marker circle to SVG (will be on top)
        svgElement.append('circle')
          .attr('class', 'fixed-marker gm-marker')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r',2)
          .style('fill', '#999')
          .style('stroke', 'none')
          .style('opacity', 1)
          .style('pointer-events', 'none'); // Don't interfere with clicks
      }
    });
    
    // Style province reference points as small white circles
    for (let i=0; i<12; i++) {
      const point = d3.select('#province_reference_point_' + (i+1) + '_point');
      if (!point.empty()) {
        point
          .style('fill','white')
          .style('stroke','#333')
          .attr('r', 8)
          .style('opacity', 0.8);
      }
      const group = d3.select('#province_reference_point_' + (i+1) + '_group');
      if (!group.empty()) {
        group.raise();
      }
  }

let provincie_polygons_ids = [  
  'polygon_flevoland',
  'polygon_friesland_0',
  'polygon_friesland_1',
  'polygon_friesland_2',
  'polygon_friesland_3',
  'polygon_friesland_4',
  'polygon_groningen',
  'polygon_drenthe',
  'polygon_overijssel',
  'polygon_gelderland',
  'polygon_noordbrabant',
  'polygon_limburg',
  'polygon_utrecht',
  'polygon_zeeland',
  'polygon_noordholland_0',
  'polygon_noordholland_1',
  'polygon_zuidholland',
]

for (i=0;i<provincie_polygons_ids.length;i++) {
  d3.select('#' + provincie_polygons_ids[i])
    // .style('fill','#E9E9E9')
    .style('fill','#fff')
    .style('pointer-events','none')
}

d3.select('#polygon_nederland_backdrop_group')
.style('pointer-events','none')
.lower()


// polygon nederland backdrop
for (i=0;i<6;i++) {
  d3.select('#polygon_nederland_backdrop_' + i)
    .style('fill','#ddd')
    .attr('class','polygon_nederland_backdrop')
    .style('stroke','#999')
    .style('stroke-width',5)
    .style('stroke-opacity',1)
    .style('pointer-events','none')

}

// Define reference points and their text labels
let referencePointsData = [
  { id: 'reference_point_flowvalue_electricity_noordbrabant_zeeland_point', text: '400',anchor: 'start', angle:0},
  { id: 'reference_point_flowvalue_electricity_zeeland_noordbranant_point', text: '200',anchor: 'end', angle:0},
  { id: 'reference_point_flowvalue_electricity_zuidholland_noordbrabant_point', text: '200',anchor: 'end', angle:45},
  { id: 'reference_point_flowvalue_electricity_noordbrabant_zuidholland_point', text: '200',anchor: 'start',angle:45},
  { id: 'reference_point_flowvalue_electricity_noordholland_zuidholland_point', text: '200',anchor: 'start',angle:-90},
  { id: 'reference_point_flowvalue_electricity_zuidholland_noordholland_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_noordholland_utrecht_point', text: '200',anchor: 'end',angle:45},
  { id: 'reference_point_flowvalue_electricity_utrecht_noordholland_point', text: '200',anchor: 'start',angle:45},
  { id: 'reference_point_flowvalue_electricity_zuidholland_utrecht_point', text: '200',anchor: 'end',angle:-45},
  { id: 'reference_point_flowvalue_electricity_utrecht_zuidholland_point', text: '200',anchor: 'start',angle:-45},
  { id: 'reference_point_flowvalue_electricity_noordholland_flevoland_point', text: '200',anchor: 'end',angle:0},
  { id: 'reference_point_flowvalue_electricity_flevoland_noordholland_point', text: '200',anchor: 'start',angle:0},
  { id: 'reference_point_flowvalue_electricity_flevoland_overijssel_point', text: '200',anchor: 'end',angle:0},
  { id: 'reference_point_flowvalue_electricity_overijssel_flevoland_point', text: '200',anchor: 'start',angle:0},
  { id: 'reference_point_flowvalue_electricity_flevoland_friesland_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_friesland_flevoland_point', text: '200',anchor: 'start',angle:-90},  
  { id: 'reference_point_flowvalue_electricity_friesland_groningen_point', text: '200',anchor: 'end',angle:0},
  { id: 'reference_point_flowvalue_electricity_groningen_friesland_point', text: '200',anchor: 'start',angle:0},
  { id: 'reference_point_flowvalue_electricity_groningen_drenthe_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_drenthe_groningen_point', text: '200',anchor: 'start',angle:-90},
  { id: 'reference_point_flowvalue_electricity_groningen_overijssel_point', text: '200',anchor: 'start',angle:-90},
  { id: 'reference_point_flowvalue_electricity_overijssel_groningen_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_drenthe_overijssel_point', text: '200',anchor: 'start',angle:-45},
  { id: 'reference_point_flowvalue_electricity_overijssel_drenthe_point', text: '200',anchor: 'end',angle:-45},
  { id: 'reference_point_flowvalue_electricity_gelderland_overijssel_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_overijssel_gelderland_point', text: '200',anchor: 'start',angle:-90},
  { id: 'reference_point_flowvalue_electricity_gelderland_limburg_point', text: '200',anchor: 'start',angle:-90},
  { id: 'reference_point_flowvalue_electricity_limburg_gelderland_point', text: '200',anchor: 'end',angle:-90},
  { id: 'reference_point_flowvalue_electricity_limburg_noordbrabant_point', text: '200',anchor: 'start',angle:45},
  { id: 'reference_point_flowvalue_electricity_noordbrabant_limburg_point', text: '200',anchor: 'end',angle:45},

  // Add more reference points here as needed
  // { id: 'reference_point_another', text: 'Another Point' },
];

// Get the SVG element
let svg = d3.select('#SVGContainer_kaart svg');

// Iterate through reference points and add text at each location
for (let i = 0; i < referencePointsData.length; i++) {
  let pointData = referencePointsData[i];
  let referencePoint = d3.select('#' + pointData.id);
  
  if (!referencePoint.empty()) {
    let cx = parseFloat(referencePoint.attr('cx'));
    let cy = parseFloat(referencePoint.attr('cy'));
    
    // Append text element at the reference point coordinates
    svg.append('text')
      .attr('x', cx)
      .attr('y', cy)
      .attr('id', pointData.id.replace('reference_point_', 'reference_text_'))
      .attr('transform', `rotate(${pointData.angle || 0}, ${cx}, ${cy})`)
      .style('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', '400')
      .style('text-anchor', pointData.anchor)
      .style('dominant-baseline', 'middle')
      .style('visibility', transportLabelVisibility)
      .text(pointData.text);
    
    // console.log(`Added text "${pointData.text}" at reference point: (${cx}, ${cy})`);
  } else {
    console.warn(`Reference point not found: ${pointData.id}`);
  }
}

for(i=0;i<30;i++){
  d3.select('#label_infra_'+i)
    .style('fill', '#888')
    .style('visibility', transportLabelVisibility)
}

// Hide all reference points after using them
window.svgViewer.hideReferencePoints(); //window.svgViewer.showReferencePoints();

    // Load municipality data and set up hover functionality
    d3.csv('./data/gemeenten.csv').then(function(data) {
      // Populate global lookup object: gm_code -> gm_naam
      data.forEach(row => {
        gmLookup[row.gm_code] = row.gm_naam;
      });
      
      // Get initial carrier color
      const initialCarrierColor = dataVisualizationState.carrierColors[dataVisualizationState.carrier] || '#f8d377';
      
      // Style GM points
      for (let i = 0; i < gmCodes.length; i++) {
        const point = d3.select('#' + gmCodes[i] + '_point')
          .style('fill', initialCarrierColor)
          .style('opacity',0.8)
          .attr('r', Math.random() * 10 + 3)
          .style('cursor', 'pointer')
          .style('stroke', 'black')
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.5)
      
        d3.select('#' + gmCodes[i] + '_group').raise();
      }
      // console.log('Municipality data loaded:', Object.keys(gmLookup).length, 'municipalities');
      loadingManager.updateProgress('svg', 100);
      resolve();
    }).catch(function(error) {
      console.error('Error loading gemeenten.csv:', error);
      
      // Get fallback carrier color
      const fallbackCarrierColor = dataVisualizationState.carrierColors[dataVisualizationState.carrier] || '#f8d377';
      
      // Fallback: still style the points even if CSV fails to load
      for(let i=0;i<gmCodes.length;i++) {
        d3.select('#' + gmCodes[i]+'_point')
          .style('fill', fallbackCarrierColor)
          .attr('r',5)
          .style('cursor', 'pointer');
        
        d3.select('#' + gmCodes[i] + '_group').raise();
      }
      loadingManager.updateProgress('svg', 100);
      resolve();
    });
  });
}

// ===== Energy Carrier Grid Visualization =====

// Define grid line IDs for each energy carrier
const GRID_LINES = {
  ELEC: [
    'electricity_noordholland_zuidholland',
    'electricity_zuidholland_noordbrabant',
    'electricity_zeeland_noordbrabant',
    'electricity_noordbrabant_limburg',
    'electricity_gelderland_limburg',
    'electricity_gelderland_overijssel',
    'electricity_flevoland_gelderland',
    'electricity_noordholland_flevoland',
    'electricity_noordholland_utrecht',
    'electricity_zuidholland_utrecht',
    'electricity_groningen_overijssel',
    'electricity_drenthe_overijssel',
    'electricity_groningen_drenthe',
    'electricity_friesland_groningen',
    'electricity_flevoland_friesland',
  ],
  H2: [
    'hydrogen_noordholland_zuidholland',
    'hydrogen_noordholland_friesland',
    'hydrogen_zeeland_zuidholland',
    'hydrogen_zeeland_noordbrabant',
    'hydrogen_overijssel_limburg',
    'hydrogen_gelderland_overijssel',
    'hydrogen_noordbrabant_gelderland',
    'hydrogen_noordholland_flevoland',
    'hydrogen_drenthe_overijssel',
    'hydrogen_groningen_drenthe',
    'hydrogen_friesland_groningen',
  ],
  METH: [
    'methane_noordholland_zuidholland',
    'methane_zuidholland_noordbrabant',
    'methane_zeeland_noordbrabant',
    'methane_noordbrabant_limburg',
    'methane_noordbrabant_gelderland',
    'methane_gelderland_overijssel',
    'methane_flevoland_gelderland',
    'methane_utrecht_overijssel',
    'methane_zuidholland_utrecht',
    'methane_drenthe_overijssel',
    'methane_groningen_drenthe',
    'methane_friesland_groningen',
    'methane_noordholland_friesland',
  ]
};

// Initialize all grid lines with consistent styling
function initializeGridLines() {
  Object.keys(GRID_LINES).forEach(carrier => {
    GRID_LINES[carrier].forEach(lineId => {
      d3.select('#' + lineId)
        .style('pointer-events', 'none')
        .style('fill', 'none')
        .style('stroke', function(){
          if(carrier === 'ELEC') return '#c99d45';
          if(carrier === 'H2') return '#7555f6';
          if(carrier === 'METH') return '#3f88ae';
          return 'black';})
        .style('stroke-width', 7)
        .style('stroke-linecap', 'round')
        .style('stroke-linejoin', 'round')
        .style('stroke-opacity', 1)
        .style('stroke-dasharray', '5,10')
        .style('stroke-dashoffset', 0)
        .style('stroke-miterlimit', 10)
        .style('opacity', 0); // Hide all initially
    });
  });
}

// Track the last grid state to avoid unnecessary updates
let lastGridState = {
  shouldShow: false,
  carrier: null
};

// Update grid visibility based on current carrier, view mode and visualization state
function updateGridVisibility() {
  // Check if we should show grids at all
  const isIndustrialDemand = dataVisualizationState.type === 'Industrial Demand';
  const isClusteredView = currentViewMode === 'clustered';
  const shouldShowGrids = dataVisualizationState.isActive && (isClusteredView || isIndustrialDemand);
  const selectedCarrier = dataVisualizationState.carrier;
  
  // Skip update if nothing has changed
  if (lastGridState.shouldShow === shouldShowGrids && lastGridState.carrier === selectedCarrier) {
    return;
  }
  
  // Update state
  lastGridState.shouldShow = shouldShowGrids;
  lastGridState.carrier = selectedCarrier;
  
  if (!shouldShowGrids) {
    // Hide all grids when visualization is not active or not in clustered/industrial view
    Object.keys(GRID_LINES).forEach(carrier => {
      GRID_LINES[carrier].forEach(lineId => {
        const element = d3.select('#' + lineId);
        if (!element.empty()) {
          const currentOpacity = element.style('opacity');
          if (currentOpacity !== '0') {
            element.transition()
              .duration(300)
              .style('opacity', 0);
          }
        }
      });
    });
    // console.log('Grid visibility updated - all grids hidden');
    return;
  }

  // Show only the grid for the selected carrier
  Object.keys(GRID_LINES).forEach(carrier => {
    const targetOpacity = (carrier === selectedCarrier) ? 0.5 : 0;
    
    GRID_LINES[carrier].forEach(lineId => {
      const element = d3.select('#' + lineId);
      if (!element.empty()) {
        const currentOpacity = parseFloat(element.style('opacity')) || 0;
        
        // Only transition if opacity needs to change
        if (currentOpacity !== targetOpacity) {
          element.transition()
            .duration(300)
            .style('opacity', targetOpacity);
        }
      }
    });
  });
  
  // console.log(`Grid visibility updated - showing ${selectedCarrier} grid in ${isClusteredView ? 'clustered' : 'industrial'} view`);
}

// ===== Selection Buttons =====

// Global active selections
// let globalActiveInfrastructure = { id: 'elektriciteit', title: 'Elektriciteit' };
let globalActiveNodes = { id: 'vraag', title: 'Vraag' };
let globalActiveCarrier = { id: 'electricity', title: 'Electricity' };
let globalActiveSector = { id: 'huishoudens', title: 'Huishoudens' };
let currentViewMode = 'geographic'; // Track current view mode
let previousViewMode = 'geographic'; // Track view mode before switching to Industrial Demand

// Helper function to create styled buttons
function createButton(button, isHighlighted = false, isDisabled = false) {
  button.className = 'button-black button-outline';
  button.style.textTransform = 'lowercase';
  button.style.display = 'inline-block';
  button.style.margin = '3px';
  button.style.fontWeight = 300;
  button.style.border = '0px solid black';
  button.style.transition = 'all 0.2s ease';
  button.style.whiteSpace = 'nowrap';
  button.style.padding = '3px 7px';
  button.style.lineHeight = '1.2';
  button.style.fontSize = '11px';
  button.style.textAlign = 'center';
  button.style.minHeight = '22px';
  button.style.height = 'auto';
  button.style.width = 'auto';
  button.style.minWidth = 'auto';
  button.style.maxWidth = 'none';
  button.style.borderRadius = '0';
  button.style.boxShadow = 'none';
  
  if (isDisabled) {
    button.style.color = '#999';
    button.style.backgroundColor = '#f0f0f0';
    button.style.cursor = 'not-allowed';
    button.style.opacity = '0.5';
    button.disabled = true;
  } else {
    button.style.color = 'black';
    button.style.backgroundColor = 'white';
    button.style.cursor = 'pointer';
    button.disabled = false;
  }
  
  if (isHighlighted && !isDisabled) {
    button.classList.add('highlighted');
    button.style.backgroundColor = 'black';
    button.style.color = 'white';
  }
}


// Draw View buttons
function drawViewButtons() {
  let views = [
    { id: 'geographic', title: 'geografisch' },
    { id: 'clustered', title: 'cluster naar provincies' },
    // { id: 'reset', title: 'Reset Data View' } 
  ];

  let container = document.getElementById('viewButtons');
  container.innerHTML = '';

  // Add label
  let label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Weergavemodus gemeenten';
  container.appendChild(label);

  // Check if Industrial Demand mode is active
  const isIndustrialDemand = dataVisualizationState.type === 'Industrial Demand';

  // Add buttons
  views.forEach((view, index) => {
    let button = document.createElement('button');
    button.textContent = view.title;
    const isHighlighted = (view.id === 'geographic' && currentViewMode === 'geographic') || 
                          (view.id === currentViewMode);
    // Disable all positioning buttons in Industrial Demand mode
    createButton(button, isHighlighted, isIndustrialDemand);

    button.onclick = function () {
      // Don't allow clicks if in Industrial Demand mode
      if (isIndustrialDemand) {
        // console.log('Positioning controls disabled in Industrial Demand mode');
        return;
      }
      
      // Remove highlight from all buttons
      let buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      // Add highlight to clicked button
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      currentViewMode = view.id;
      previousViewMode = view.id; // Save as previous mode for when switching to Industrial Demand
      // console.log('Selected view:', view.title);
      
      if (view.id === 'clustered') {
        clusterGMPointsByProvince();
        // If in industrial demand mode, don't keep large white circles
        if (dataVisualizationState.type !== 'Industrial Demand' && dataVisualizationState.isActive) {
          // Make sure circles stay #DCE6EF for municipal data clustering
          for (let i = 0; i < 12; i++) {
            const circle = d3.select(`#province_reference_point_${i+1}_point`);
            if (!circle.empty()) {
              circle
                .style('fill', '#DCE6EF')
                .style('opacity', 0.5);
            }
          }
        }
      } else if (view.id === 'reset') {
        resetDataVisualization();
        restoreGeographicView();
      } else {
        restoreGeographicView();
      }
      
      // Update grid visibility based on new view mode
      updateGridVisibility();
    };

    container.appendChild(button);
  });
}

// ===== Data Visualization Buttons =====

// Sector definitions by carrier and type
const sectorDefinitions = {
  'ELEC': {
    'Demand': ['Agriculture', 'Buildings', 'Buildings_hp_electric', 'Buildings_hp_hybrid', 'CO2_storage', 'Datacenters', 'Direct_air_capture', 'District_heat_network', 'Households', 'Households_hp_electric', 'Households_hp_hybrid', 'Other_demand', 'Transport_bus', 'Transport_car', 'Transport_other', 'Transport_plane', 'Transport_ship', 'Transport_train', 'Transport_tram', 'Transport_truck', 'Transport_van'],
    'Flexibility': ['Agriculture_CHP', 'Agriculture_PtH', 'Battery_households', 'Battery_solar_PV', 'Battery_system', 'Battery_transport', 'Battery_wind_onshore', 'Curtailment', 'Datacenters_DSR', 'Deficit', 'District_PtH', 'Hydro_storage', 'IDES_storage', 'MDES_storage', 'Power_plant_coal', 'Power_plant_hydrogen', 'Power_plant_hydrogen_backup', 'Power_plant_methane', 'Power_plant_methane_CHP', 'Power_plant_methane_backup', 'Power_plant_nuclear', 'Power_plant_nuclear_SMR', 'Power_plant_other', 'Power_plant_waste', 'Power_to_gas_offshore', 'Power_to_gas_onshore'],
    'Supply': ['Hydro_RoR', 'Power_plant_biomass', 'Solar_PV_buildings', 'Solar_PV_field', 'Solar_PV_households', 'Wind_offshore', 'Wind_offshore_hybrid', 'Wind_onshore'],
    'Industrial Demand': []  // Populated dynamically from provincial data
  },
  'H2': {
    'Demand': ['Agriculture', 'Buildings_combi_boiler', 'Buildings_hp_hybrid', 'District_heat_network', 'Households_combi_boiler', 'Households_hp_hybrid', 'Other_demand', 'Transport', 'Transport_plane', 'Transport_ship'],
    'Exchange': ['Export', 'Import'],
    'Flexibility': ['Power_plant_hydrogen', 'Power_plant_hydrogen_backup', 'Power_to_gas_onshore', 'Storage'],
    'Supply': ['Ammonia_reformer', 'Biomass_hydrogen_production', 'Blue_hydrogen_production', 'Grey_hydrogen_production', 'LOHC', 'Liquid_hydrogen', 'Power_to_gas_solar_PV', 'Power_to_gas_wind_offshore_dedicated', 'Power_to_gas_wind_offshore_hybrid'],
    'Industrial Demand': []  // Populated dynamically from provincial data
  },
  'METH': {
    'Demand': ['Agriculture', 'Agriculture_CHP', 'Biomass_hydrogen_production', 'Blue_hydrogen_production', 'Buildings', 'Buildings_combi_boiler', 'Buildings_hp_hybrid', 'District_heat_network', 'Grey_hydrogen_production', 'Households', 'Households_combi_boiler', 'Households_hp_hybrid', 'Other_demand', 'Transport_other'],
    'Exchange': ['Export', 'Import'],
    'Flexibility': ['Power_plant_methane', 'Power_plant_methane_CHP', 'Power_plant_methane_backup', 'Storage'],
    'Supply': ['Green_gas_dry_gasification', 'Green_gas_fermentation', 'Green_gas_wet_gasification', 'Natural_gas_production'],
    'Industrial Demand': []  // Populated dynamically from provincial data
  }
};

function drawScenarioButtons_map() {
  const scenarios = [
    { id: 'Eigen Vermogen', title: 'Eigen Vermogen' },
    { id: 'Gezamenlijke Balans', title: 'Gezamenlijke Balans' },
    { id: 'Horizon Aanvoer', title: 'Horizon Aanvoer' },
    { id: 'Koersvaste Middenweg', title: 'Koersvaste Middenweg' }
  ];

  const container = document.getElementById('scenarioButtons_map');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Scenario';
  container.appendChild(label);

  scenarios.forEach((scenario, index) => {
    const button = document.createElement('button');
    button.textContent = scenario.title;
    const isHighlighted = scenario.id === dataVisualizationState.scenario;
    createButton(button, isHighlighted, false);

    button.onclick = function () {
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      dataVisualizationState.scenario = scenario.id;
      // console.log('Selected scenario:', scenario.title);
      drawYearButtons(); // Refresh year buttons as availability changes
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        // If in clustered view, update province circle sizes
        if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
          updateProvinceCircleSizes();
        }
      }
    };

    container.appendChild(button);
  });
}

function drawYearButtons() {
  const yearsByScenario = {
    'Eigen Vermogen': [2030, 2035, 2040, 2050],
    'Gezamenlijke Balans': [2030, 2035, 2040, 2050],
    'Horizon Aanvoer': [2030, 2035, 2040, 2050],
    'Koersvaste Middenweg': [2025, 2030, 2035, 2040, 2050]
  };

  const availableYears = yearsByScenario[dataVisualizationState.scenario] || [2030, 2035, 2040, 2050];
  
  // If current year is not available for this scenario, select first available
  if (!availableYears.includes(dataVisualizationState.year)) {
    dataVisualizationState.year = availableYears[0];
  }
  
  const container = document.getElementById('yearButtons');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Jaar';
  container.appendChild(label);

  availableYears.forEach((year, index) => {
    const button = document.createElement('button');
    button.textContent = year.toString();
    const isHighlighted = year === dataVisualizationState.year;
    createButton(button, isHighlighted, false);

    button.onclick = function () {
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      dataVisualizationState.year = year;
      // console.log('Selected year:', year);
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        // If in clustered view, update province circle sizes
        if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
          updateProvinceCircleSizes();
        }
      }
    };

    container.appendChild(button);
  });
}

function drawDataCarrierButtons() {
  const carriers = [
    { id: 'ELEC', title: 'Elektriciteit' },
    { id: 'H2', title: 'Waterstof' },
    { id: 'METH', title: 'Methaan' }
  ];

  const container = document.getElementById('dataCarrierButtons');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Drager';
  container.appendChild(label);

  carriers.forEach((carrier, index) => {
    const button = document.createElement('button');
    button.textContent = carrier.title;
    const isHighlighted = carrier.id === dataVisualizationState.carrier;
    createButton(button, isHighlighted, false);

    button.onclick = function () {
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      dataVisualizationState.carrier = carrier.id;
      // console.log('Selected carrier:', carrier.title);
      drawDataTypeButtons(); // Refresh type buttons as options change per carrier
      drawSectorButtons(); // Refresh sectors as they depend on carrier
      updateGridVisibility(); // Update grid lines based on selected carrier
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        // If in clustered view, update province circle sizes
        if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
          updateProvinceCircleSizes();
        }
      }
    };

    container.appendChild(button);
  });
}

function drawMetricTypeButtons() {
  const metrics = [
    { id: 'capacity', title: 'Vermogen (MW)' },
    { id: 'volume', title: 'Volume (TWh)' }
  ];

  const container = document.getElementById('metricTypeButtons');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Eenheid';
  container.appendChild(label);

  metrics.forEach((metric, index) => {
    const button = document.createElement('button');
    button.textContent = metric.title;
    const isHighlighted = metric.id === dataVisualizationState.metricType;
    createButton(button, isHighlighted, false);

    button.onclick = function () {
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      dataVisualizationState.metricType = metric.id;
      // console.log('Selected metric type:', metric.title);
      
      // Update the unit selector toggle
      updateMapUnitSelectorToggle();
      
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        // If in clustered view, update province circle sizes
        if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
          updateProvinceCircleSizes();
        }
      }
    };

    container.appendChild(button);
  });
}

// Global unit display preferences (shared between map and sankey)
window.globalDisplayUnits = {
  capacity: 'MW',  // Can be 'MW' or 'GW'
  volume: 'TWh'    // Can be 'TWh' or 'PJ'
};

// Draw unit selector toggle for the map (similar to sankey)
function drawMapUnitSelector() {
  const container = d3.select('#unitSelector_map');
  
  // Clear any existing content
  container.selectAll('*').remove();
  
  container
    .append('div')
    .attr('id', 'unitSelectorDiv_map')
    .style('width', '200px')
    .style('height', '35px')
    .style('position', 'absolute')
    .style('top', '0px')
    .style('right', '0px')
    .append('svg')
    .attr('width', 200)
    .attr('height', 35)
    .attr('id', 'selectorButtonSVG_map')
    .attr('transform', 'scale(0.8)');
  
  const sCanvas = d3.select('#selectorButtonSVG_map').append('g');
  
  // Toggle background
  sCanvas.append('rect')
    .attr('id', 'mapUnitToggle')
    .attr('x', 50)
    .attr('y', 0)
    .attr('width', 50)
    .attr('height', 25)
    .attr('fill', '#FFF')
    .attr('rx', 12.5)
    .attr('ry', 12.5)
    .style('stroke', '#333')
    .style('stroke-width', 0.5)
    .style('pointer-events', 'auto')
    .style('cursor', 'pointer')
    .on('click', function() {
      // Toggle units based on current metric type
      if (dataVisualizationState.metricType === 'capacity') {
        // Toggle between MW and GW
        window.globalDisplayUnits.capacity = window.globalDisplayUnits.capacity === 'MW' ? 'GW' : 'MW';
        // console.log('Toggled capacity unit to:', window.globalDisplayUnits.capacity);
      } else {
        // Toggle between TWh and PJ
        window.globalDisplayUnits.volume = window.globalDisplayUnits.volume === 'TWh' ? 'PJ' : 'TWh';
        // console.log('Toggled volume unit to:', window.globalDisplayUnits.volume);
        
        // Update sankey unit selector to match (if it exists)
        if (typeof window.currentUnit !== 'undefined') {
          window.currentUnit = window.globalDisplayUnits.volume;
          // Update the sankey selector indicator
          d3.selectAll('#selectorStatus').transition().duration(200).attr('cx', function () {
            return window.currentUnit == 'PJ' ? 63 : 87;
          });
          
          // Trigger sankey redraw to show new units
          if (typeof window.setScenario === 'function') {
            window.setScenario();
          }
        }
      }
      
      // Update the toggle indicator position and labels
      updateMapUnitSelectorToggle();
      
      // Update the visualization to reflect new units
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        // If in clustered view, update province circle sizes
        if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
          updateProvinceCircleSizes();
        }
      }
    });
  
  // Toggle indicator circle
  sCanvas.append('circle')
    .attr('id', 'mapSelectorStatus')
    .style('pointer-events', 'none')
    .attr('cx', 63) // Will be updated by updateMapUnitSelectorToggle
    .attr('cy', 12.5)
    .attr('r', 10)
    .attr('fill', '#444');
  
  // Label: Left side (will be updated)
  sCanvas.append('text')
    .attr('id', 'mapUnitLabel_left')
    .attr('x', 19.5)
    .attr('y', 18.5)
    .attr('fill', '#444')
    .style('font-size', '15px')
    .style('font-weight', 400)
    .style('pointer-events', 'none')
    .text('');
  
  // Label: Right side (will be updated)
  sCanvas.append('text')
    .attr('id', 'mapUnitLabel_right')
    .attr('x', 113.5)
    .attr('y', 18.5)
    .attr('fill', '#444')
    .style('font-size', '15px')
    .style('font-weight', 400)
    .style('pointer-events', 'none')
    .text('');
  
  // Initial update
  updateMapUnitSelectorToggle();
}

// Update the toggle indicator position and labels based on current metric type
function updateMapUnitSelectorToggle() {
  if (dataVisualizationState.metricType === 'capacity') {
    // Show MW vs GW
    const isGW = window.globalDisplayUnits.capacity === 'GW';
    d3.select('#mapSelectorStatus')
      .transition()
      .duration(200)
      .attr('cx', isGW ? 87 : 63);
    
    d3.select('#mapUnitLabel_left').text('MW');
    d3.select('#mapUnitLabel_right').text('GW');
  } else {
    // Show PJ vs TWh
    const isTWh = window.globalDisplayUnits.volume === 'TWh';
    d3.select('#mapSelectorStatus')
      .transition()
      .duration(200)
      .attr('cx', isTWh ? 87 : 63);
    
    d3.select('#mapUnitLabel_left').text('PJ');
    d3.select('#mapUnitLabel_right').text('TWh');
  }
}

function drawDataTypeButtons() {
  const carrier = dataVisualizationState.carrier;
  const availableTypes = Object.keys(sectorDefinitions[carrier] || {});
  
  const container = document.getElementById('dataTypeButtons');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Categorie';
  container.appendChild(label);

  availableTypes.forEach((type, index) => {
    const button = document.createElement('button');
    button.textContent = type;
    const isHighlighted = type === dataVisualizationState.type;
    createButton(button, isHighlighted, false);

    button.onclick = function () {
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      const previousType = dataVisualizationState.type;
      dataVisualizationState.type = type;
      // console.log('Selected type:', type);
      
      // Handle view mode transitions when switching to/from Industrial Demand
      if (type === 'Industrial Demand' && previousType !== 'Industrial Demand') {
        // Switching TO Industrial Demand - save current view mode
        previousViewMode = currentViewMode;
        
        // If not already in geographic, transition to it
        if (currentViewMode !== 'geographic') {
          currentViewMode = 'geographic';
          
          // Don't call restoreGeographicView() - it would shrink circles unnecessarily
          // Just restore GM positions without affecting provincial circles
          gmCodes.forEach(gmCode => {
            const pointElement = d3.select(`#${gmCode}_point`);
            if (!pointElement.empty() && originalGMPositions[gmCode]) {
              pointElement
                .transition()
                .duration(600)
                .attr('cx', originalGMPositions[gmCode].cx)
                .attr('cy', originalGMPositions[gmCode].cy)
                .ease(d3.easeCubicInOut);
            }
          });
        }
      } else if (type !== 'Industrial Demand' && previousType === 'Industrial Demand') {
        // Switching FROM Industrial Demand back to municipal data - restore previous view mode
        if (previousViewMode === 'clustered') {
          currentViewMode = 'clustered';
          // Trigger clustering after a short delay to ensure data is loaded
          setTimeout(() => {
            clusterGMPointsByProvince();
          }, 200);
        }
      }
      
      drawViewButtons(); // Refresh positioning buttons (disable for Industrial Demand)
      drawSectorButtons(); // Refresh sectors as they depend on type
      updateGridVisibility(); // Update grid visibility based on type and view mode
      if (dataVisualizationState.isActive) {
        updateDataVisualization();
        
        // If in clustered view, update province circle sizes based on new data type
        if (currentViewMode === 'clustered' && type !== 'Industrial Demand') {
          setTimeout(() => {
            updateProvinceCircleSizes();
          }, 100); // Small delay to ensure data is updated
        }
      }
    };

    container.appendChild(button);
  });
}

function drawSectorButtons() {
  const carrier = dataVisualizationState.carrier;
  const type = dataVisualizationState.type;
  let availableSectors = [];
  
  // Check if this is provincial industrial demand data
  const isProvincialData = type === 'Industrial Demand';
  
  if (isProvincialData && provincialDataLoader && provincialDataLoader.loaded) {
    // Get sectors from provincial data
    availableSectors = provincialDataLoader.getSectorsForCarrierAndType(carrier, 'Demand');
  } else {
    // Get sectors from municipal data
    availableSectors = (sectorDefinitions[carrier] && sectorDefinitions[carrier][type]) || [];
  }
  
  const container = document.getElementById('sectorButtons');
  if (!container) return;
  
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'menu-label';
  label.textContent = 'Asset';
  container.appendChild(label);

  if (availableSectors.length === 0) {
    const message = document.createElement('span');
    message.textContent = 'No sectors available';
    message.style.fontSize = '12px';
    message.style.color = '#666';
    message.style.padding = '4px 8px';
    container.appendChild(message);
    return;
  }

  // Check if current sector is valid for this carrier/type combination
  if (!availableSectors.includes(dataVisualizationState.sector)) {
    // Set to first available sector with data
    dataVisualizationState.sector = availableSectors[0];
  }
  
  // Find sectors with data
  const sectorsWithData = [];
  availableSectors.forEach(sector => {
    let hasData = false;
    
    if (isProvincialData && provincialDataLoader && provincialDataLoader.loaded) {
      // Check provincial data
      const provinces = ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland',
                         'gelderland', 'utrecht', 'noordholland', 'zuidholland',
                         'zeeland', 'noordbrabant', 'limburg'];
      hasData = provinces.some(province => {
        const value = provincialDataLoader.query({
          scenario: dataVisualizationState.scenario,
          year: dataVisualizationState.year,
          carrier: dataVisualizationState.carrier,
          metricType: dataVisualizationState.metricType,
          province: province,
          type: 'Demand',  // Always 'Demand' for industrial data
          sector: sector
        });
        return value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value));
      });
    } else if (municipalDataLoader && municipalDataLoader.loaded) {
      // Check municipal data
      const sampleCodes = gmCodes.slice(0, 10);
      hasData = sampleCodes.some(gmCode => {
        const value = municipalDataLoader.query({
          scenario: dataVisualizationState.scenario,
          year: dataVisualizationState.year,
          carrier: dataVisualizationState.carrier,
          metricType: dataVisualizationState.metricType,
          gmCode: gmCode,
          type: dataVisualizationState.type,
          sector: sector
        });
        // Consider data available if it returns a valid number (including 0)
        return value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value));
      });
    } else {
      hasData = true;
    }
    if (hasData) {
      sectorsWithData.push(sector);
    }
  });
  
  // If current sector has no data, switch to first sector with data
  if (!sectorsWithData.includes(dataVisualizationState.sector) && sectorsWithData.length > 0) {
    dataVisualizationState.sector = sectorsWithData[0];
  }

  availableSectors.forEach((sector, index) => {
    const button = document.createElement('button');
    button.textContent = sector.replace(/_/g, ' ');
    
    // Check if this sector has data (use pre-calculated list)
    const hasData = sectorsWithData.includes(sector);
    const isHighlighted = sector === dataVisualizationState.sector;
    const isDisabled = !hasData;
    createButton(button, isHighlighted, isDisabled);

    button.onclick = function () {
      if (isDisabled) return; // Don't allow clicking disabled buttons
      
      const buttons = container.getElementsByTagName('button');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('highlighted');
        buttons[i].style.backgroundColor = 'white';
        buttons[i].style.color = 'black';
      }
      
      button.classList.add('highlighted');
      button.style.backgroundColor = 'black';
      button.style.color = 'white';

      dataVisualizationState.sector = sector;
      dataVisualizationState.isActive = true;
      // console.log('Selected sector:', sector);
      updateGridVisibility(); // Show grid lines when visualization is activated
      updateDataVisualization();
      
      // If in clustered view, update province circle sizes based on new sector
      if (currentViewMode === 'clustered' && dataVisualizationState.type !== 'Industrial Demand') {
        setTimeout(() => {
          updateProvinceCircleSizes();
        }, 100); // Small delay to ensure data is updated
      }
    };

    container.appendChild(button);
  });
  
  // Auto-activate visualization on first load
  if (!dataVisualizationState.isActive && availableSectors.length > 0) {
    dataVisualizationState.isActive = true;
    updateGridVisibility(); // Show grid lines when auto-activating
    // console.log('Data visualization activated with sector:', dataVisualizationState.sector);
  }
}

// Function to calculate global max values for consistent scaling
function calculateGlobalMaxValues() {
  if (!municipalDataLoader || !municipalDataLoader.loaded) {
    // console.log('Cannot calculate global max - data not loaded');
    return;
  }

  // console.log('Calculating global max values for consistent scaling...');
  
  let maxVolume = 0;
  let maxCapacity = 0;
  
  const scenarios = ['Eigen Vermogen', 'Gezamenlijke Balans', 'Horizon Aanvoer', 'Koersvaste Middenweg'];
  const years = [2025, 2030, 2035, 2040, 2050];
  const carriers = ['ELEC', 'H2', 'METH'];
  const provinces = ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland', 
                     'gelderland', 'utrecht', 'noordholland', 'zuidholland', 
                     'zeeland', 'noordbrabant', 'limburg'];
  
  // Sample a subset of municipalities for faster calculation
  const sampleGMCodes = gmCodes.filter((_, index) => index % 10 === 0); // Every 10th municipality
  
  scenarios.forEach(scenario => {
    years.forEach(year => {
      carriers.forEach(carrier => {
        const types = Object.keys(sectorDefinitions[carrier] || {});
        
        types.forEach(type => {
          const sectors = sectorDefinitions[carrier][type] || [];
          
          sectors.forEach(sector => {
            // Check a sample of municipalities
            sampleGMCodes.forEach(gmCode => {
              // Volume (MWh converted to TWh)
              const volumeValue = municipalDataLoader.query({
                scenario: scenario,
                year: year,
                carrier: carrier,
                metricType: 'volume',
                gmCode: gmCode,
                type: type,
                sector: sector
              });
              
              if (volumeValue !== 'ERROR - data not available' && volumeValue !== null && !isNaN(parseFloat(volumeValue))) {
                // Convert MWh to TWh before comparing
                const twhValue = Math.abs(parseFloat(volumeValue)) / 1000000;
                maxVolume = Math.max(maxVolume, twhValue);
              }
              
              // Capacity (MW)
              const capacityValue = municipalDataLoader.query({
                scenario: scenario,
                year: year,
                carrier: carrier,
                metricType: 'capacity',
                gmCode: gmCode,
                type: type,
                sector: sector
              });
              
              if (capacityValue !== 'ERROR - data not available' && capacityValue !== null && !isNaN(parseFloat(capacityValue))) {
                maxCapacity = Math.max(maxCapacity, Math.abs(parseFloat(capacityValue)));
              }
            });
            
            // Also check provincial data (Industrial Demand)
            if (provincialDataLoader && provincialDataLoader.loaded) {
              provinces.forEach(province => {
                // Volume (MWh converted to TWh)
                const volumeValue = provincialDataLoader.query({
                  scenario: scenario,
                  year: year,
                  carrier: carrier,
                  metricType: 'volume',
                  province: province,
                  type: 'Demand',
                  sector: sector
                });
                
                if (volumeValue !== 'ERROR - data not available' && volumeValue !== null && !isNaN(parseFloat(volumeValue))) {
                  // Convert MWh to TWh before comparing
                  const twhValue = Math.abs(parseFloat(volumeValue)) / 1000000;
                  maxVolume = Math.max(maxVolume, twhValue);
                }
                
                // Capacity (MW)
                const capacityValue = provincialDataLoader.query({
                  scenario: scenario,
                  year: year,
                  carrier: carrier,
                  metricType: 'capacity',
                  province: province,
                  type: 'Demand',
                  sector: sector
                });
                
                if (capacityValue !== 'ERROR - data not available' && capacityValue !== null && !isNaN(parseFloat(capacityValue))) {
                  maxCapacity = Math.max(maxCapacity, Math.abs(parseFloat(capacityValue)));
                }
              });
            }
          });
        });
      });
    });
  });
  
  dataVisualizationState.globalMaxVolume = maxVolume;
  dataVisualizationState.globalMaxCapacity = maxCapacity;
  
  // console.log(`Global max volume (TWh): ${maxVolume.toFixed(2)}`);
  // console.log(`Global max capacity (MW): ${maxCapacity.toFixed(2)}`);
}

// Function to update circle sizes based on data
function updateDataVisualization() {
  // Only run if data visualization is active
  if (!dataVisualizationState.isActive) {
    return;
  }
  
  const isProvincialData = dataVisualizationState.type === 'Industrial Demand';
  
  if (isProvincialData) {
    updateProvincialDataVisualization();
  } else {
    updateMunicipalDataVisualization();
  }
}

function updateMunicipalDataVisualization() {
  if (!municipalDataLoader || !municipalDataLoader.loaded) {
    // console.log('Municipal data not loaded yet');
    return;
  }

  // console.log('Updating municipal visualization with:', dataVisualizationState);
  
  // Clean up provincial circles (labels are persistent and will be updated)
  resetProvincialCircles();

  // Collect all values to determine min/max for scaling
  const values = [];
  const dataByGM = {};

  gmCodes.forEach(gmCode => {
    const value = municipalDataLoader.query({
      scenario: dataVisualizationState.scenario,
      year: dataVisualizationState.year,
      carrier: dataVisualizationState.carrier,
      metricType: dataVisualizationState.metricType,
      gmCode: gmCode,
      type: dataVisualizationState.type,
      sector: dataVisualizationState.sector
    });

    if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
      let numValue = Math.abs(parseFloat(value)); // Use absolute value for sizing
      // Convert MWh to TWh for volume metrics
      if (dataVisualizationState.metricType === 'volume') {
        numValue = numValue / 1000000;
      }
      values.push(numValue);
      dataByGM[gmCode] = numValue;
    }
  });

  // Calculate total and check if all values are zero
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  
  if (values.length === 0 || totalValue === 0) {
    // console.log('No data or all zeros for current selection - showing zero label');
    // Hide all circles
    gmCodes.forEach(gmCode => {
      d3.select(`#${gmCode}_point`)
        .transition()
        .duration(300)
        .attr('r', 0)
        .style('opacity', 0);
    });
    // Show zero total label
    showZeroTotalLabel();
    updateTopLeftTotal(0);
    return;
  }
  
  // Hide zero label if it's showing
  hideZeroTotalLabel();
  
  // Update top left total display
  updateTopLeftTotal(totalValue);

  // Calculate min/max for current selection (for logging)
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Use global max for consistent scaling across all queries
  const globalMax = dataVisualizationState.metricType === 'volume' 
    ? dataVisualizationState.globalMaxVolume 
    : dataVisualizationState.globalMaxCapacity;
  
  if (!globalMax) {
    console.warn('Global max not calculated yet, using current max');
  }
  
  const scaleMax = globalMax || maxValue;
  
  // console.log(`Current data range: ${minValue.toFixed(2)} to ${maxValue.toFixed(2)}`);
  // console.log(`Using global max for scaling: ${scaleMax.toFixed(2)} ${dataVisualizationState.metricType === 'volume' ? 'TWh' : 'MW'}`);
  // console.log(`Circle size range: ${dataVisualizationState.minRadius}px (min) to ${dataVisualizationState.maxRadius}px (max)`);

  // Create scale function with global max for consistent scaling
  const radiusScale = d3.scaleSqrt()
    .domain([0, scaleMax])
    .range([dataVisualizationState.minRadius, dataVisualizationState.maxRadius]);

  // Get carrier-specific color
  const carrierColor = dataVisualizationState.carrierColors[dataVisualizationState.carrier] || '#ff0026';
  
  // Update all circles
  let updatedCount = 0;
  let notFoundCount = 0;
  
  gmCodes.forEach(gmCode => {
    const pointElement = d3.select(`#${gmCode}_point`);
    
    if (pointElement.empty()) {
      notFoundCount++;
      return;
    }
    
    const value = dataByGM[gmCode];

    if (value !== undefined) {
      const newRadius = radiusScale(value);
      
      pointElement
        .interrupt() // Interrupt any ongoing transitions
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr('r', newRadius)
        .style('fill', carrierColor)
        .style('opacity', 1);
      updatedCount++;
    } else {
      // No data for this municipality
      pointElement
        .interrupt() // Interrupt any ongoing transitions
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr('r', dataVisualizationState.minRadius)
        .style('fill', '#ccc')
        .style('opacity', 0.3);
    }
  });

  // console.log(`Updated ${updatedCount} municipalities with data, ${notFoundCount} not found in SVG`);
  
  // Update province labels immediately
  showProvinceTotalBars();
  
  // If in clustered view, repack circles after size transitions complete
  // The province reference circles won't re-animate because they're already at target size
  if (currentViewMode === 'clustered') {
    setTimeout(() => {
      // console.log('Repacking circles in clustered view after data change...');
      clusterGMPointsByProvince();
    }, 400); // Wait for transitions to complete (300ms + buffer)
  }
}

function updateProvincialDataVisualization() {
  if (!provincialDataLoader || !provincialDataLoader.loaded) {
    // console.log('Provincial data not loaded yet');
    return;
  }

  // console.log('Updating provincial visualization with:', dataVisualizationState);

  // Hide all GM circles (labels are persistent and will be updated)
  gmCodes.forEach(gmCode => {
    d3.select(`#${gmCode}_point`)
      .interrupt()
      .transition()
      .duration(300)
      .ease(d3.easeCubicInOut)
      .attr('r', 0)
      .style('opacity', 0);
  });

  const provinces = [
    { name: 'groningen', refNum: 5 },
    { name: 'friesland', refNum: 6 },
    { name: 'drenthe', refNum: 4 },
    { name: 'overijssel', refNum: 3 },
    { name: 'flevoland', refNum: 2 },
    { name: 'gelderland', refNum: 7 },
    { name: 'utrecht', refNum: 8 },
    { name: 'noordholland', refNum: 1 },
    { name: 'zuidholland', refNum: 9 },
    { name: 'zeeland', refNum: 12 },
    { name: 'noordbrabant', refNum: 10 },
    { name: 'limburg', refNum: 11 }
  ];

  // Collect all values
  const values = [];
  const dataByProvince = {};

  provinces.forEach(({ name }) => {
    const value = provincialDataLoader.query({
      scenario: dataVisualizationState.scenario,
      year: dataVisualizationState.year,
      carrier: dataVisualizationState.carrier,
      metricType: dataVisualizationState.metricType,
      province: name,
      type: 'Demand',  // Always 'Demand' for industrial data
      sector: dataVisualizationState.sector
    });

    if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
      let numValue = Math.abs(parseFloat(value));
      // Convert MWh to TWh for volume metrics
      if (dataVisualizationState.metricType === 'volume') {
        numValue = numValue / 1000000;
      }
      values.push(numValue);
      dataByProvince[name] = numValue;
    }
  });



  // Calculate total and check if all values are zero
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  
  if (values.length === 0 || totalValue === 0) {
    // console.log('No provincial data or all zeros for current selection - showing zero label');
    // Remove provincial data circles
    d3.select('#SVGContainer_kaart svg').selectAll('.provincial-data-circle').remove();
    // Hide all province circles
    for (let i = 0; i < 12; i++) {
      const circle = d3.select(`#province_reference_point_${i+1}_point`);
      if (!circle.empty()) {
        circle
          .transition()
          .duration(300)
          .attr('r', 0)
          .style('opacity', 0);
      }
    }
    // Show zero total label
    showZeroTotalLabel();
    updateTopLeftTotal(0);
    return;
  }
  
  // Hide zero label if it's showing
  hideZeroTotalLabel();
  
  // Update top left total display
  updateTopLeftTotal(totalValue);

  // Use global max values for consistent scaling
  const globalMax = dataVisualizationState.metricType === 'volume' 
    ? dataVisualizationState.globalMaxVolume 
    : dataVisualizationState.globalMaxCapacity;

  // console.log(`Using global max for provincial data: ${globalMax.toFixed(2)}`);
  // console.log(`Provincial data range: ${Math.min(...values).toFixed(2)} to ${Math.max(...values).toFixed(2)}`);

  const radiusScale = d3.scaleSqrt()
    .domain([0, globalMax])
    .range([dataVisualizationState.minRadius, dataVisualizationState.maxRadius]);  // Use same range as municipal data

  // Get carrier-specific color
  const carrierColor = dataVisualizationState.carrierColors[dataVisualizationState.carrier] || '#ff0026';

  // Make province reference circles large only if they have data > 0
  provinces.forEach(({ name, refNum }) => {
    const circle = d3.select(`#province_reference_point_${refNum}_point`);
    
    if (circle.empty()) {
      console.warn(`Province reference point ${refNum} not found in SVG`);
      return;
    }
    
    const value = dataByProvince[name];
    const hasData = value !== undefined && value > 0;
    const currentRadius = parseFloat(circle.attr('r')) || 8;
    
    if (hasData) {
      // Province has data - make circle large
      if (Math.abs(currentRadius - 120) > 1) {
        circle
          .interrupt()
          .transition()
          .duration(300)
          .attr('r', 120)
          .style('fill', '#DCE6EF')
          .style('opacity', 0.5)
          .ease(d3.easeCubicInOut);
      } else {
        circle
          .style('fill', '#DCE6EF')
          .style('opacity', 0.5);
      }
    } else {
      // Province has no data - keep or shrink to small size
      if (currentRadius > 8) {
        circle
          .interrupt()
          .transition()
          .duration(300)
          .attr('r', 8)
          .style('fill', 'white')
          .style('opacity', 0.8)
          .ease(d3.easeCubicInOut);
      }
    }
  });

  // Update or create provincial data circles (don't remove existing ones)
  const svg = d3.select('#SVGContainer_kaart svg');
  let updatedCount = 0;
  let createdCount = 0;



  provinces.forEach(({ name, refNum }) => {
    const refPoint = d3.select(`#province_reference_point_${refNum}_point`);

    if (refPoint.empty()) {
      console.warn(`Province reference point ${refNum} not found`);
      return;
    }

    const cx = parseFloat(refPoint.attr('cx'));
    const cy = parseFloat(refPoint.attr('cy'));
    const value = dataByProvince[name];

    // Find existing circle for this province
    let existingCircle = svg.select(`.provincial-data-circle[data-province="${name}"]`);

    // Create or update data circle if value exists
    if (value !== undefined && value > 0) {
      const newRadius = radiusScale(value);

      if (!existingCircle.empty()) {
        // Update existing circle - transition from current radius to new radius
        existingCircle
          .interrupt() // Interrupt any ongoing transitions
          .transition()
          .duration(300)
          .ease(d3.easeCubicInOut)
          .attr('r', newRadius)
          .style('fill', carrierColor)
          .style('opacity', 1);
        updatedCount++;
      } else {
        // Create new circle starting from radius 0
        svg.append('circle')
          .attr('class', 'provincial-data-circle')
          .attr('data-province', name)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 0)
          .style('stroke','#333')
          .style('stroke-width',1)
          .style('fill', carrierColor)
          .style('opacity', 0)
          .style('pointer-events', 'none')
          .transition()
          .duration(300)
          .ease(d3.easeCubicInOut)
          .attr('r', newRadius)
          .style('opacity', 1);
        createdCount++;
      }
    } else if (!existingCircle.empty()) {
      // Remove circle if it exists but has no data
      existingCircle
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr('r', 0)
        .style('opacity', 0)
        .remove();
    }
  });

  // console.log(`Updated ${updatedCount} provinces, created ${createdCount} new circles`);
  
  // Update province labels immediately
  updateProvinceTotalLabels(dataByProvince);
}

// Province metadata (shared across functions)
const PROVINCE_METADATA = [
  { name: 'groningen', displayName: 'Groningen', refNum: 5 },
  { name: 'friesland', displayName: 'Friesland', refNum: 6 },
  { name: 'drenthe', displayName: 'Drenthe', refNum: 4 },
  { name: 'overijssel', displayName: 'Overijssel', refNum: 3 },
  { name: 'flevoland', displayName: 'Flevoland', refNum: 2 },
  { name: 'gelderland', displayName: 'Gelderland', refNum: 7 },
  { name: 'utrecht', displayName: 'Utrecht', refNum: 8 },
  { name: 'noordholland', displayName: 'Noord-Holland', refNum: 1 },
  { name: 'zuidholland', displayName: 'Zuid-Holland', refNum: 9 },
  { name: 'zeeland', displayName: 'Zeeland', refNum: 12 },
  { name: 'noordbrabant', displayName: 'Noord-Brabant', refNum: 10 },
  { name: 'limburg', displayName: 'Limburg', refNum: 11 }
];

// Initialize province labels once (called during initialization)
function initializeProvinceTotalLabels() {
  const svg = d3.select('#SVGContainer_kaart svg');
  
  // Clean up any old-style labels that may exist
  svg.selectAll('.province-bar').remove();
  svg.selectAll('.provincial-data-label').remove();
  
  PROVINCE_METADATA.forEach(({ name, displayName, refNum }) => {
    const refPoint = d3.select(`#province_reference_point_${refNum}_point`);
    if (refPoint.empty()) return;
    
    const cx = parseFloat(refPoint.attr('cx'));
    const cy = parseFloat(refPoint.attr('cy'));
    
    // Fixed vertical offset from reference point (consistent across all views)
    const labelY = cy + 65;
    
    // Create persistent label group (initially hidden)
    const labelGroup = svg.append('g')
      .attr('class', 'province-total-label')
      .attr('data-province', name)
      .style('opacity', 0)  // Start hidden
      .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))');
    
    // Add background rectangle (will be resized as needed)
    const initialWidth = 150;  // Default width, will be adjusted when data loads
    labelGroup.append('rect')
      .attr('class', 'label-bg')
      .attr('x', cx - initialWidth / 2)
      .attr('y', labelY - 22)
      .attr('width', initialWidth)
      .attr('height', 44)
      .attr('fill', 'white')
      .attr('fill-opacity', 0.92)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .attr('rx', 8);
    
    // Add text label
    labelGroup.append('text')
      .attr('class', 'label-text')
      .attr('x', cx)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '20px')
      .style('font-weight', '600')
      .style('fill', '#000')
      .text('');  // Empty initially
  });
}

// Update province total labels with new data
function updateProvinceTotalLabels(dataByProvince) {
  const svg = d3.select('#SVGContainer_kaart svg');
  
  // Clean up any old-style labels (safeguard)
  svg.selectAll('.province-bar').remove();
  svg.selectAll('.provincial-data-label').remove();
  
  if (!dataVisualizationState.isActive) {
    // Hide all labels when not active
    d3.selectAll('.province-total-label').style('opacity', 0);
    return;
  }
  
  const labelPadding = 22;
  
  PROVINCE_METADATA.forEach(({ name, displayName, refNum }) => {
    const value = dataByProvince[name];
    const hasData = value !== undefined && value > 0;
    
    const labelGroup = svg.select(`.province-total-label[data-province="${name}"]`);
    if (labelGroup.empty()) return;
    
    if (!hasData) {
      // Hide label for provinces with no data or zero value
      labelGroup.style('opacity', 0);
      return;
    }
    
    // Format the value
    const formattedValue = formatConvertedValue(value, dataVisualizationState.metricType);
    const labelText = `${displayName}: ${formattedValue}`;
    
    // Get reference point position
    const refPoint = d3.select(`#province_reference_point_${refNum}_point`);
    if (refPoint.empty()) return;
    
    const cx = parseFloat(refPoint.attr('cx'));
    const cy = parseFloat(refPoint.attr('cy'));
    const labelY = cy + 65;  // Fixed offset
    
    // Update text content
    const textElement = labelGroup.select('.label-text');
    textElement.text(labelText);
    
    // Temporarily show the label for measurement, position text element
    textElement.attr('x', cx).attr('y', labelY);
    labelGroup.style('visibility', 'visible').style('opacity', 1);
    
    // Force a synchronous layout to ensure text is rendered
    const textNode = textElement.node();
    textNode.getBBox(); // This forces layout
    
    // Now measure - should be accurate
    const textWidth = textNode.getComputedTextLength();
    
    // Update background rectangle position and size
    labelGroup.select('.label-bg')
      .attr('x', cx - (textWidth / 2 + labelPadding))
      .attr('y', labelY - 22)
      .attr('width', textWidth + labelPadding * 2);
    
    // Show label and raise to top
    labelGroup
      .style('opacity', 0.8)
      .raise(); // Move to end of SVG to render on top
  });
}

// Legacy function names for compatibility (now just call updateProvinceTotalLabels)
function showProvincialDataLabels(dataByProvince, carrierColor) {
  updateProvinceTotalLabels(dataByProvince);
}

function hideProvincialDataLabels() {
  // Don't remove labels, just hide them temporarily if needed
  // Labels will be shown/hidden by updateProvinceTotalLabels based on data
}

// Function to reset province circles to default state
function resetProvincialCircles() {
  // Remove provincial data circles
  d3.select('#SVGContainer_kaart svg').selectAll('.provincial-data-circle').remove();
  
  // Don't reset size if in clustered view - keep them at large size (120)
  if (currentViewMode === 'clustered') {
    // Only reset fill and opacity, keep radius at 120
    for (let i = 0; i < 12; i++) {
      const circle = d3.select(`#province_reference_point_${i+1}_point`);
      if (!circle.empty()) {
        circle.style('fill', '#DCE6EF');
        // .style('opacity', 1)
      }
    }
  } else {
    // In geographic view, reset to small circles
    for (let i = 0; i < 12; i++) {
      const circle = d3.select(`#province_reference_point_${i+1}_point`);
      if (!circle.empty()) {
        circle
          .interrupt()
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('r', 8)
          .style('fill', 'white')
          .style('opacity', 1);
      }
    }
  }
}

// Function to reset circles to default
function resetDataVisualization() {
  dataVisualizationState.isActive = false;
  updateGridVisibility(); // Hide grid lines when visualization is deactivated
  const carrierColor = dataVisualizationState.carrierColors[dataVisualizationState.carrier] || '#f8d377';
  
  // Reset GM circles to default
  gmCodes.forEach(gmCode => {
    d3.select(`#${gmCode}_point`)
      .transition()
      .duration(300)
      .ease(d3.easeCubicInOut)
      .attr('r', dataVisualizationState.defaultRadius)
      .style('fill', carrierColor)
      .style('opacity', 1);
  });
  
  // Reset provincial circles (labels are persistent and will be hidden)
  resetProvincialCircles();
  hideZeroTotalLabel();
  
  // Hide all labels by updating with empty data
  updateProvinceTotalLabels({});
  
  // Hide top left total
  d3.select('#SVGContainer_kaart svg').selectAll('.top-left-total').remove();
  
  // console.log('Reset to default view');
}

// Function to calculate centroid of a polygon path
function getPolygonCentroid(pathElement) {
  const pathData = pathElement.getAttribute('d');
  const commands = pathData.match(/[ML][^ML]*/g);
  
  let points = [];
  commands.forEach(cmd => {
    if (cmd[0] === 'M' || cmd[0] === 'L') {
      const coords = cmd.slice(1).trim().split(/\s+/);
      if (coords.length >= 2) {
        points.push({
          x: parseFloat(coords[0]),
          y: parseFloat(coords[1])
        });
      }
    }
  });
  
  // Calculate centroid
  let sumX = 0, sumY = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

// Mapping of provinces to reference point numbers
const provinceToReferencePoint = {
  'noordholland': 1,
  'flevoland': 2,
  'overijssel': 3,
  'drenthe': 4,
  'groningen': 5,
  'friesland': 6,
  'gelderland': 7,
  'utrecht': 8,
  'zuidholland': 9,
  'noordbrabant': 10,
  'limburg': 11,
  'zeeland': 12
};

// Function to update province circle sizes based on current data
function updateProvinceCircleSizes() {
  // Only for municipal data in clustered view
  if (dataVisualizationState.type === 'Industrial Demand' || currentViewMode !== 'clustered') {
    return;
  }
  
  if (!municipalDataLoader || !municipalDataLoader.loaded) {
    return;
  }
  
  const provinces = ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland', 
                     'gelderland', 'utrecht', 'noordholland', 'zuidholland', 
                     'zeeland', 'noordbrabant', 'limburg'];
  
  // Initialize province totals
  const provinceTotals = {};
  provinces.forEach(province => {
    provinceTotals[province] = 0;
  });
  
  // Iterate through gmCodes ONCE and accumulate by province (much faster!)
  gmCodes.forEach(gmCode => {
    const province = gmToProvince[gmCode];
    if (!province || !provinceTotals.hasOwnProperty(province)) return;
    
    const value = municipalDataLoader.query({
      scenario: dataVisualizationState.scenario,
      year: dataVisualizationState.year,
      carrier: dataVisualizationState.carrier,
      metricType: dataVisualizationState.metricType,
      gmCode: gmCode,
      type: dataVisualizationState.type,
      sector: dataVisualizationState.sector
    });
    
    if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
      let numValue = Math.abs(parseFloat(value));
      // Convert MWh to TWh for volume metrics
      if (dataVisualizationState.metricType === 'volume') {
        numValue = numValue / 1000000;
      }
      provinceTotals[province] += numValue;
    }
  });
  
  // Update circle sizes based on totals (using requestAnimationFrame for better performance)
  requestAnimationFrame(() => {
    provinces.forEach(province => {
      const refNum = provinceToReferencePoint[province];
      if (!refNum) return;
      
      const circle = d3.select(`#province_reference_point_${refNum}_point`);
      if (circle.empty()) return;
      
      const hasData = provinceTotals[province] > 0;
      
      // Always interrupt any ongoing transitions
      circle.interrupt();
      
      if (hasData) {
        // Province has data - make circle large
        circle
          .transition()
          .duration(200)
          .attr('r', 120)
          .style('fill', '#DCE6EF')
          .style('opacity', 0.5)
          .ease(d3.easeCubicInOut);
      } else {
        // Province has no data - keep small
        circle
          .transition()
          .duration(200)
          .attr('r', 8)
          .style('fill', 'white')
          .style('opacity', 0.8)
          .ease(d3.easeCubicInOut);
      }
    });
  });
}

// Mapping of GM codes to provinces (based on gm_codes_and_provinces.csv)
const gmToProvince = {
  'GM1680': 'drenthe', 'GM0358': 'noordholland', 'GM0197': 'gelderland', 'GM0059': 'friesland',
  'GM0482': 'zuidholland', 'GM0613': 'zuidholland', 'GM0361': 'noordholland', 'GM0141': 'overijssel',
  'GM0034': 'flevoland', 'GM0484': 'zuidholland', 'GM1723': 'noordbrabant', 'GM1959': 'noordbrabant',
  'GM0060': 'friesland', 'GM0307': 'utrecht', 'GM0362': 'noordholland', 'GM0363': 'noordholland',
  'GM0200': 'gelderland', 'GM0202': 'gelderland', 'GM0106': 'drenthe', 'GM0743': 'noordbrabant',
  'GM0744': 'noordbrabant', 'GM0308': 'utrecht', 'GM0489': 'zuidholland', 'GM0203': 'gelderland',
  'GM0888': 'limburg', 'GM1954': 'limburg', 'GM0889': 'limburg', 'GM1945': 'gelderland',
  'GM1724': 'noordbrabant', 'GM0893': 'limburg', 'GM0373': 'noordholland', 'GM0748': 'noordbrabant',
  'GM1859': 'gelderland', 'GM1721': 'noordbrabant', 'GM0753': 'noordbrabant', 'GM0209': 'gelderland',
  'GM0375': 'noordholland', 'GM0310': 'utrecht', 'GM1728': 'noordbrabant', 'GM0376': 'noordholland',
  'GM0377': 'noordholland', 'GM1901': 'zuidholland', 'GM0755': 'noordbrabant', 'GM1681': 'drenthe',
  'GM0147': 'overijssel', 'GM0654': 'zeeland', 'GM0757': 'noordbrabant', 'GM0758': 'noordbrabant',
  'GM1876': 'gelderland', 'GM0213': 'gelderland', 'GM0899': 'limburg', 'GM0312': 'utrecht',
  'GM0313': 'utrecht', 'GM0214': 'gelderland', 'GM0502': 'zuidholland', 'GM0383': 'noordholland',
  'GM0109': 'drenthe', 'GM1706': 'noordbrabant', 'GM0216': 'gelderland', 'GM0148': 'overijssel',
  'GM1891': 'friesland', 'GM0503': 'zuidholland', 'GM0762': 'noordbrabant', 'GM0150': 'overijssel',
  'GM0384': 'noordholland', 'GM1980': 'noordholland', 'GM1774': 'overijssel', 'GM0221': 'gelderland',
  'GM0222': 'gelderland', 'GM0766': 'noordbrabant', 'GM0505': 'zuidholland', 'GM0498': 'noordholland',
  'GM1719': 'noordbrabant', 'GM0303': 'flevoland', 'GM0225': 'gelderland', 'GM0226': 'gelderland',
  'GM1711': 'limburg', 'GM0385': 'noordholland', 'GM0228': 'gelderland', 'GM0317': 'utrecht',
  'GM1979': 'groningen', 'GM0770': 'noordbrabant', 'GM1903': 'limburg', 'GM0772': 'noordbrabant',
  'GM0230': 'gelderland', 'GM0114': 'drenthe', 'GM0388': 'noordholland', 'GM0153': 'overijssel',
  'GM0232': 'gelderland', 'GM0233': 'gelderland', 'GM0777': 'noordbrabant', 'GM1940': 'friesland',
  'GM0779': 'noordbrabant', 'GM1771': 'noordbrabant', 'GM1652': 'noordbrabant', 'GM0907': 'limburg',
  'GM0784': 'noordbrabant', 'GM1924': 'zuidholland', 'GM0664': 'zeeland', 'GM0785': 'noordbrabant',
  'GM1942': 'noordholland', 'GM0512': 'zuidholland', 'GM0513': 'zuidholland', 'GM0518': 'zuidholland',
  'GM0014': 'groningen', 'GM1729': 'limburg', 'GM0158': 'overijssel', 'GM0392': 'noordholland',
  'GM0394': 'noordholland', 'GM1655': 'noordbrabant', 'GM0160': 'overijssel', 'GM0243': 'gelderland',
  'GM0523': 'zuidholland', 'GM0072': 'friesland', 'GM0244': 'gelderland', 'GM0396': 'noordholland',
  'GM0397': 'noordholland', 'GM0246': 'gelderland', 'GM0074': 'friesland', 'GM0917': 'limburg',
  'GM1658': 'noordbrabant', 'GM0399': 'noordholland', 'GM0400': 'noordholland', 'GM0163': 'overijssel',
  'GM0794': 'noordbrabant', 'GM0531': 'zuidholland', 'GM0164': 'overijssel', 'GM0796': 'noordbrabant',
  'GM0252': 'gelderland', 'GM0797': 'noordbrabant', 'GM0534': 'zuidholland', 'GM0798': 'noordbrabant',
  'GM0402': 'noordholland', 'GM1963': 'zuidholland', 'GM1735': 'overijssel', 'GM1966': 'groningen',
  'GM1911': 'noordholland', 'GM0118': 'drenthe', 'GM0405': 'noordholland', 'GM1507': 'limburg',
  'GM0321': 'utrecht', 'GM0406': 'noordholland', 'GM0677': 'zeeland', 'GM0353': 'utrecht',
  'GM1884': 'zuidholland', 'GM0166': 'overijssel', 'GM0678': 'zeeland', 'GM0537': 'zuidholland',
  'GM0928': 'limburg', 'GM1598': 'noordholland', 'GM0542': 'zuidholland', 'GM1931': 'zuidholland',
  'GM1659': 'noordbrabant', 'GM1982': 'noordbrabant', 'GM0882': 'limburg', 'GM0415': 'noordholland',
  'GM1621': 'zuidholland', 'GM0417': 'noordholland', 'GM0080': 'friesland', 'GM0546': 'zuidholland',
  'GM0547': 'zuidholland', 'GM1916': 'zuidholland', 'GM0995': 'flevoland', 'GM1640': 'limburg',
  'GM0327': 'utrecht', 'GM1705': 'gelderland', 'GM0553': 'zuidholland', 'GM0262': 'gelderland',
  'GM0809': 'noordbrabant', 'GM0331': 'utrecht', 'GM0168': 'overijssel', 'GM0263': 'gelderland',
  'GM1641': 'limburg', 'GM1991': 'noordbrabant', 'GM0556': 'zuidholland', 'GM0935': 'limburg',
  'GM0420': 'noordholland', 'GM0938': 'limburg', 'GM1948': 'noordbrabant', 'GM0119': 'drenthe',
  'GM0687': 'zeeland', 'GM1842': 'zuidholland', 'GM1731': 'drenthe', 'GM1952': 'groningen',
  'GM1709': 'noordbrabant', 'GM1978': 'zuidholland', 'GM1955': 'gelderland', 'GM0335': 'utrecht',
  'GM0944': 'limburg', 'GM1740': 'gelderland', 'GM0946': 'limburg', 'GM0356': 'utrecht',
  'GM0569': 'zuidholland', 'GM0267': 'gelderland', 'GM0268': 'gelderland', 'GM1930': 'zuidholland',
  'GM1970': 'friesland', 'GM1695': 'zeeland', 'GM1699': 'drenthe', 'GM0171': 'flevoland',
  'GM0575': 'zuidholland', 'GM0820': 'noordbrabant', 'GM0302': 'gelderland', 'GM0579': 'zuidholland',
  'GM0823': 'noordbrabant', 'GM0824': 'noordbrabant', 'GM1895': 'groningen', 'GM0269': 'gelderland',
  'GM0173': 'overijssel', 'GM1773': 'overijssel', 'GM0175': 'overijssel', 'GM1586': 'gelderland',
  'GM0826': 'noordbrabant', 'GM0085': 'friesland', 'GM0431': 'noordholland', 'GM0432': 'noordholland',
  'GM0086': 'friesland', 'GM0828': 'noordbrabant', 'GM1509': 'gelderland', 'GM0437': 'noordholland',
  'GM0589': 'utrecht', 'GM1734': 'gelderland', 'GM0590': 'zuidholland', 'GM1894': 'limburg',
  'GM0765': 'groningen', 'GM1926': 'zuidholland', 'GM0439': 'noordholland', 'GM0273': 'gelderland',
  'GM0177': 'overijssel', 'GM0703': 'zeeland', 'GM0274': 'gelderland', 'GM0339': 'utrecht',
  'GM1667': 'noordbrabant', 'GM0275': 'gelderland', 'GM0340': 'utrecht', 'GM0597': 'zuidholland',
  'GM1742': 'overijssel', 'GM0603': 'zuidholland', 'GM1669': 'limburg', 'GM0957': 'limburg',
  'GM0736': 'utrecht', 'GM1674': 'noordbrabant', 'GM0599': 'zuidholland', 'GM0277': 'gelderland',
  'GM0840': 'noordbrabant', 'GM0441': 'noordholland', 'GM0279': 'gelderland', 'GM0606': 'zuidholland',
  'GM0088': 'friesland', 'GM1676': 'zeeland', 'GM0965': 'limburg', 'GM0845': 'noordbrabant',
  'GM1883': 'limburg', 'GM0610': 'zuidholland', 'GM1714': 'zeeland', 'GM0090': 'friesland',
  'GM0342': 'utrecht', 'GM0847': 'noordbrabant', 'GM0848': 'noordbrabant', 'GM0037': 'groningen',
  'GM0180': 'overijssel', 'GM0532': 'noordholland', 'GM0851': 'noordbrabant', 'GM1708': 'overijssel',
  'GM0971': 'limburg', 'GM1904': 'utrecht', 'GM1900': 'friesland', 'GM0715': 'zeeland',
  'GM0093': 'friesland', 'GM0448': 'noordholland', 'GM1525': 'zuidholland', 'GM0716': 'zeeland',
  'GM0281': 'gelderland', 'GM0855': 'noordbrabant', 'GM0183': 'overijssel', 'GM1700': 'overijssel',
  'GM1730': 'drenthe', 'GM0737': 'friesland', 'GM0450': 'noordholland', 'GM0451': 'noordholland',
  'GM0184': 'flevoland', 'GM0344': 'utrecht', 'GM1581': 'utrecht', 'GM0981': 'limburg',
  'GM0994': 'limburg', 'GM0858': 'noordbrabant', 'GM0047': 'groningen', 'GM0345': 'utrecht',
  'GM0717': 'zeeland', 'GM0861': 'noordbrabant', 'GM0453': 'noordholland', 'GM0983': 'limburg',
  'GM0984': 'limburg', 'GM1961': 'utrecht', 'GM0622': 'zuidholland', 'GM0096': 'friesland',
  'GM0718': 'zeeland', 'GM0986': 'limburg', 'GM1992': 'zuidholland', 'GM0626': 'zuidholland',
  'GM0285': 'gelderland', 'GM0865': 'noordbrabant', 'GM1949': 'friesland', 'GM0866': 'noordbrabant',
  'GM0867': 'noordbrabant', 'GM0627': 'zuidholland', 'GM0289': 'gelderland', 'GM0629': 'zuidholland',
  'GM0852': 'noordholland', 'GM0988': 'limburg', 'GM1960': 'gelderland', 'GM0668': 'gelderland',
  'GM1969': 'groningen', 'GM1701': 'drenthe', 'GM0293': 'gelderland', 'GM1950': 'groningen',
  'GM1783': 'zuidholland', 'GM0098': 'friesland', 'GM0189': 'overijssel', 'GM0296': 'gelderland',
  'GM1696': 'noordholland', 'GM0352': 'utrecht', 'GM0294': 'gelderland', 'GM0873': 'noordbrabant',
  'GM0632': 'utrecht', 'GM1690': 'drenthe', 'GM0880': 'noordholland', 'GM0351': 'utrecht',
  'GM0479': 'noordholland', 'GM0297': 'gelderland', 'GM0473': 'noordholland', 'GM0050': 'flevoland',
  'GM0355': 'utrecht', 'GM0299': 'gelderland', 'GM0637': 'zuidholland', 'GM0638': 'zuidholland',
  'GM1892': 'zuidholland', 'GM0879': 'noordbrabant', 'GM0301': 'gelderland', 'GM1896': 'overijssel',
  'GM0642': 'zuidholland', 'GM0193': 'overijssel'
};

// Function to cluster GM points by province using force simulation
function clusterGMPointsByProvince() {
  const svg = d3.select('#SVGContainer_kaart svg');
  
  // Labels are persistent and will be updated after clustering
  
  // Get all province polygons
  const provinces = ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland', 
                     'gelderland', 'utrecht', 'noordholland', 'zuidholland', 
                     'zeeland', 'noordbrabant', 'limburg'];
  
  // Calculate totals for each province first (for sizing reference circles)
  const provinceTotals = {};
  if (dataVisualizationState.type !== 'Industrial Demand' && municipalDataLoader && municipalDataLoader.loaded) {
    provinces.forEach(province => {
      let provinceTotal = 0;
      
      gmCodes.forEach(gmCode => {
        const provinceForGM = gmToProvince[gmCode];
        if (provinceForGM === province) {
          const value = municipalDataLoader.query({
            scenario: dataVisualizationState.scenario,
            year: dataVisualizationState.year,
            carrier: dataVisualizationState.carrier,
            metricType: dataVisualizationState.metricType,
            gmCode: gmCode,
            type: dataVisualizationState.type,
            sector: dataVisualizationState.sector
          });
          
          if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
            let numValue = Math.abs(parseFloat(value));
            // Convert MWh to TWh for volume metrics
            if (dataVisualizationState.metricType === 'volume') {
              numValue = numValue / 1000000;
            }
            provinceTotal += numValue;
          }
        }
      });
      
      provinceTotals[province] = provinceTotal;
    });
  }
  
  // Size province reference point circles based on data
  // Only do this if NOT in industrial demand mode
  if (dataVisualizationState.type !== 'Industrial Demand') {
    provinces.forEach(province => {
      const refNum = provinceToReferencePoint[province];
      if (!refNum) return;
      
      const circle = d3.select(`#province_reference_point_${refNum}_point`);
      
      // Check if the element exists before trying to access its attributes
      if (circle.empty()) {
        console.warn(`Province reference point ${refNum} not found in SVG for ${province}`);
        return;
      }
      
      const hasData = provinceTotals[province] && provinceTotals[province] > 0;
      
      // Always interrupt any ongoing transitions
      circle.interrupt();
      
      if (hasData) {
        // Province has data - make circle large
        circle
          .transition()
          .duration(600)
          .attr('r', 120)
          .style('fill', '#DCE6EF')
          .style('opacity', 0.5)
          .ease(d3.easeCubicInOut);
      } else {
        // Province has no data - keep small
        circle
          .transition()
          .duration(600)
          .attr('r', 8)
          .style('fill', 'white')
          .style('opacity', 0.8)
          .ease(d3.easeCubicInOut);
      }
    });
  }
  
  // Group GM codes by province
  const gmByProvince = {};
  provinces.forEach(prov => gmByProvince[prov] = []);
  
  // Categorize each GM code
  gmCodes.forEach(gmCode => {
    const province = gmToProvince[gmCode];
    if (province && gmByProvince[province]) {
      gmByProvince[province].push(gmCode);
    } else {
      // If province not found in mapping, try to determine by current position
      const pointElement = d3.select(`#${gmCode}_point`);
      if (!pointElement.empty()) {
        const cx = parseFloat(pointElement.attr('cx'));
        const cy = parseFloat(pointElement.attr('cy'));
        
        // Find closest province reference point
        let closestProvince = null;
        let closestDist = Infinity;
        
        provinces.forEach(prov => {
          const refPointNum = provinceToReferencePoint[prov];
          const refPoint = d3.select(`#province_reference_point_${refPointNum}_point`);
          if (!refPoint.empty()) {
            const refX = parseFloat(refPoint.attr('cx'));
            const refY = parseFloat(refPoint.attr('cy'));
            const dist = Math.sqrt(Math.pow(cx - refX, 2) + Math.pow(cy - refY, 2));
            if (dist < closestDist) {
              closestDist = dist;
              closestProvince = prov;
            }
          }
        });
        
        if (closestProvince && gmByProvince[closestProvince]) {
          gmByProvince[closestProvince].push(gmCode);
        }
      }
    }
  });
  
  // Now cluster each province's GM points using force simulation
  provinces.forEach(province => {
    if (gmByProvince[province].length > 0) {
      // Get center point from reference point instead of polygon centroid
      const refPointNum = provinceToReferencePoint[province];
      const refPoint = d3.select(`#province_reference_point_${refPointNum}_point`);
      
      if (refPoint.empty()) {
        console.warn(`Reference point not found for ${province}`);
        return;
      }
      
      const centroid = {
        x: parseFloat(refPoint.attr('cx')),
        y: parseFloat(refPoint.attr('cy'))
      };
      
      const provinceMunicipalities = gmByProvince[province];
      
      // Create nodes data for force simulation (exclude circles with zero or near-zero radius)
      const nodes = provinceMunicipalities
        .map(gmCode => {
          const pointElement = d3.select(`#${gmCode}_point`);
          
          // Store original position if not already stored
          if (!originalGMPositions[gmCode]) {
            originalGMPositions[gmCode] = {
              cx: parseFloat(pointElement.attr('cx')),
              cy: parseFloat(pointElement.attr('cy'))
            };
          }
          
          const radius = parseFloat(pointElement.attr('r')) || 0;
          
          return {
            gmCode: gmCode,
            x: centroid.x + (Math.random() - 0.5) * 50, // Start near centroid with some randomness
            y: centroid.y + (Math.random() - 0.5) * 50,
            radius: radius
          };
        })
        .filter(node => node.radius > 0.5);  // Only include circles with meaningful radius
      
      // console.log(`${province}: ${nodes.length} of ${provinceMunicipalities.length} municipalities with data (at ${centroid.x.toFixed(0)}, ${centroid.y.toFixed(0)})`);
      
      // Skip if no circles to pack
      if (nodes.length === 0) {
        return;
      }
      
      // Create force simulation for circle packing
      const simulation = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(0.5))
        .force('center', d3.forceCenter(centroid.x, centroid.y).strength(0.1))
        .force('collision', d3.forceCollide().radius(d => d.radius + 2).strength(0.9))
        .force('x', d3.forceX(centroid.x).strength(0.1))
        .force('y', d3.forceY(centroid.y).strength(0.1))
        .alphaDecay(0.02)
        .stop();
      
      // Run simulation for a fixed number of ticks
      for (let i = 0; i < 300; i++) {
        simulation.tick();
      }
      
      // Animate circles to their computed positions
      nodes.forEach(node => {
        const pointElement = d3.select(`#${node.gmCode}_point`);
        
        pointElement
          .transition()
          .duration(1200)
          .attr('cx', node.x)
          .attr('cy', node.y)
          .ease(d3.easeCubicInOut);
      });
    }
  });
  
  // Update province labels immediately (labels are persistent)
  showProvinceTotalBars();
}

// Calculate municipal data totals by province and update labels
function showProvinceTotalBars() {
  if (!dataVisualizationState.isActive || !municipalDataLoader || !municipalDataLoader.loaded) {
    return;
  }
  
  const provinces = ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland', 
                     'gelderland', 'utrecht', 'noordholland', 'zuidholland', 
                     'zeeland', 'noordbrabant', 'limburg'];
  
  // Calculate totals for each province
  const dataByProvince = {};
  
  provinces.forEach(province => {
    let provinceTotal = 0;
    
    gmCodes.forEach(gmCode => {
      const provinceForGM = gmToProvince[gmCode];
      if (provinceForGM === province) {
        const value = municipalDataLoader.query({
          scenario: dataVisualizationState.scenario,
          year: dataVisualizationState.year,
          carrier: dataVisualizationState.carrier,
          metricType: dataVisualizationState.metricType,
          gmCode: gmCode,
          type: dataVisualizationState.type,
          sector: dataVisualizationState.sector
        });
        
        if (value !== 'ERROR - data not available' && value !== null && !isNaN(parseFloat(value))) {
          let numValue = Math.abs(parseFloat(value));
          // Convert MWh to TWh for volume metrics
          if (dataVisualizationState.metricType === 'volume') {
            numValue = numValue / 1000000;
          }
          provinceTotal += numValue;
        }
      }
    });
    
    // Store the total (even if zero)
    dataByProvince[province] = provinceTotal;
  });
  
  // Update labels immediately using the unified system
  updateProvinceTotalLabels(dataByProvince);
}

// Function to hide province total bars
function hideProvinceTotalBars() {
  // Labels are persistent, just hide them by updating with empty data
  updateProvinceTotalLabels({});
}

// Function to restore geographic view
function restoreGeographicView() {
  // Labels are persistent and will be updated after restoration
  
  gmCodes.forEach(gmCode => {
    const pointElement = d3.select(`#${gmCode}_point`);
    
    if (!pointElement.empty() && originalGMPositions[gmCode]) {
      pointElement
        .transition()
        .duration(1200)
        .attr('cx', originalGMPositions[gmCode].cx)
        .attr('cy', originalGMPositions[gmCode].cy)
        .ease(d3.easeCubicInOut);
    }
  });
  
  // Restore radius of province reference point circles
  for (let i = 0; i < 12; i++) {
    const circle = d3.select(`#province_reference_point_${i+1}_point`);
    if (!circle.empty()) {
      circle
        .transition()
        .duration(600)
        .attr('r', 8)
        .style('opacity', 1)
        .ease(d3.easeCubicOut);
    }
  }
  
  // Update province labels immediately
  showProvinceTotalBars();
}

// ===== Master Initialization Function =====
async function initializeApplication() {
  try {
    // console.log('Starting application initialization...');
    
    // Step 0: Wait for SVG Viewer to load the SVG file
    // console.log('Waiting for SVG to load...');
    loadingManager.updateProgress('svg', 0);
    await window.svgViewer.ready;
    // console.log('SVG loaded successfully');

    
    // Step 1: Initialize SVG elements
    loadingManager.updateProgress('svg', 20);
    loadingManager.updateProgress('initialization', 10);
    await initializeSVGElements();
    
    // Initialize persistent province total labels
    // console.log('Initializing province label system...');
    initializeProvinceTotalLabels();
    
    // Step 2: Load data with progress tracking
    // console.log('Loading municipal and provincial data...');
    
    // Track municipal data loading progress
    const municipalPromise = municipalDataLoader.loadAllData().then(() => {
      loadingManager.updateProgress('municipal', 100);
      // console.log('Municipal data loaded successfully!');
    });
    
    // Track provincial data loading progress  
    const provincialPromise = provincialDataLoader.loadAllData().then(() => {
      loadingManager.updateProgress('provincial', 100);
      // console.log('Provincial data loaded successfully!');
    });
    
    // Simulate progress for data loaders (since they don't have built-in progress tracking)
    const simulateProgress = setInterval(() => {
      const municipalStep = loadingManager.steps.find(s => s.name === 'municipal');
      const provincialStep = loadingManager.steps.find(s => s.name === 'provincial');
      
      if (municipalStep.progress < 90) {
        loadingManager.updateProgress('municipal', municipalStep.progress + 5);
      }
      if (provincialStep.progress < 90) {
        loadingManager.updateProgress('provincial', provincialStep.progress + 5);
      }
    }, 200);
    
    await Promise.all([municipalPromise, provincialPromise]);
    clearInterval(simulateProgress);
    
    // Step 3: Initialize UI components
    loadingManager.updateProgress('initialization', 50);
    // console.log('Initializing UI components...');
    
    // Initialize grid lines before drawing UI
    initializeGridLines();
    
    drawViewButtons();
    drawScenarioButtons_map();
    drawYearButtons();
    drawDataCarrierButtons();
    drawMetricTypeButtons();
    drawDataTypeButtons();
    drawSectorButtons();
    
    // Draw unit selector toggle for the map
    drawMapUnitSelector();
    
    // Calculate global max values for consistent scaling
    calculateGlobalMaxValues();
    
    // Auto-select specific defaults after page load to ensure proper label initialization
    // console.log('Setting default selections: Koersvaste Middenweg, 2025, Households');
    setTimeout(() => {
      // Set scenario to 'Koersvaste Middenweg'
      const scenarioButtons = document.getElementById('scenarioButtons_map');
      if (scenarioButtons) {
        const buttons = scenarioButtons.getElementsByTagName('button');
        for (let button of buttons) {
          if (button.textContent === 'Koersvaste Middenweg') {
            button.click();
            break;
          }
        }
      }
      
      // Set year to 2025
      setTimeout(() => {
        const yearButtons = document.getElementById('yearButtons');
        if (yearButtons) {
          const buttons = yearButtons.getElementsByTagName('button');
          for (let button of buttons) {
            if (button.textContent === '2025') {
              button.click();
              break;
            }
          }
        }
        
        // Set sector to 'Households' (Huishoudens)
        setTimeout(() => {
          const sectorButtons = document.getElementById('sectorButtons');
          if (sectorButtons) {
            const buttons = sectorButtons.getElementsByTagName('button');
            for (let button of buttons) {
              if (button.textContent === 'Huishoudens') {
                button.click();
                break;
              }
            }
          }
        }, 100);
      }, 100);
    }, 200);
    
    loadingManager.updateProgress('initialization', 100);
    loadingManager.complete();
    
    // Step 4: Hide splash screen and show viewer
    // console.log('Application initialized successfully!');
    setTimeout(() => {
      const splash = document.getElementById('loading-splash');
      const mainContainer = document.getElementById('main-container');
      
      if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 500);
      }
      
      if (mainContainer) {
        mainContainer.style.display = 'block';
        // Smooth fade-in
        mainContainer.style.opacity = '0';
        setTimeout(() => {
          mainContainer.style.transition = 'opacity 0.5s ease';
          mainContainer.style.opacity = '1';
        }, 50);
      }
    }, 300); // Brief delay to show completion state
    
    // Step 5: Setup sticky menu positioning
    setupStickyMenuPositioning();
    
  } catch (error) {
    console.error('Error during application initialization:', error);
    const statusText = document.getElementById('loading-status');
    if (statusText) {
      statusText.textContent = 'Error loading application. Please refresh the page.';
      statusText.style.color = '#ff6b6b';
    }
  }
}

// Function to position the sankey menu sticky below the map menu
function setupStickyMenuPositioning() {
  const mapMenu = document.getElementById('sticky-menu-map');
  const sankeyMenu = document.getElementById('sticky-menu-sankey');
  
  if (!mapMenu || !sankeyMenu) {
    console.warn('Could not find sticky menu elements for positioning');
    return;
  }
  
  // Function to update the sankey menu position
  function updateSankeyMenuPosition() {
    const mapMenuHeight = mapMenu.offsetHeight;
    sankeyMenu.style.top = `${mapMenuHeight}px`;
  }
  
  // Initial positioning
  updateSankeyMenuPosition();
  
  // Update on window resize (buttons might wrap to different lines)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateSankeyMenuPosition, 100);
  }, { passive: true });
  
  // Use ResizeObserver to detect when the map menu height changes (e.g., buttons wrapping)
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      updateSankeyMenuPosition();
    });
    resizeObserver.observe(mapMenu);
  }
  
  // console.log('Sticky menu positioning initialized');
}

// Placeholder functions for backwards compatibility (no longer used)
function pauseMenuVisibilityObserver() {
  // No-op
}

function resumeMenuVisibilityObserver() {
  // No-op
}

// Make these functions globally accessible for backwards compatibility
window.pauseMenuVisibilityObserver = pauseMenuVisibilityObserver;
window.resumeMenuVisibilityObserver = resumeMenuVisibilityObserver;

// Make these functions and state globally accessible so sankey can trigger map updates
window.updateDataVisualization = updateDataVisualization;
window.updateMapUnitSelectorToggle = updateMapUnitSelectorToggle;
window.dataVisualizationState = dataVisualizationState;

// Start the application
initializeApplication();