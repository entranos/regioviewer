// About Modal - License and Attribution
// This file handles the About modal popup display and content

// Modal HTML content
const aboutModalHTML = `
  <div id="aboutModal" class="about-modal">
    <div class="about-modal-content">
      <span class="about-modal-close" onclick="hideAboutModal()">&times;</span>
      <section aria-labelledby="license-attribution-title">
        <h2 id="license-attribution-title">Over deze viewer</h2>

        <div class="about-section">
          <p>Ontwikkeld door <a href="https://www.linkedin.com/in/tijslangeveld/" target="_blank">Tijs Langeveld</a>, 2025. Deze webapplicatie maakt gebruik van de volgende open source bibliotheken:</p>
          
          <div class="license-item">
            <div class="license-header">
              <span class="license-name">D3.js (Data Driven Documents)</span>
              <span class="license-badge bsd">BSD 3-Clause</span>
            </div>
            <div class="license-details">
              &copy; 2010–heden Mike Bostock<br>
              <a href="https://d3js.org" rel="nofollow noopener" target="_blank">d3js.org</a>
            </div>
          </div>

          <div class="license-item">
            <div class="license-header">
              <span class="license-name">d3-sankey-diagram</span>
              <span class="license-badge mit">MIT</span>
            </div>
            <div class="license-details">
              &copy; Rick Lupton<br>
              <a href="https://github.com/ricklupton/d3-sankey-diagram" rel="nofollow noopener"
                target="_blank">github.com/ricklupton/d3-sankey-diagram</a>
            </div>
          </div>
           <div class="license-item">
             <div class="license-header">
               <span class="license-name">SheetJS</span>
               <span class="license-badge apache">Apache 2.0</span>
             </div>
             <div class="license-details">
               &copy; 2012–heden SheetJS LLC<br>
               <a href="https://github.com/SheetJS/sheetjs" rel="nofollow noopener"
                 target="_blank">github.com/SheetJS/sheetjs</a>
             </div>
           </div>

           <div class="license-item">
             <div class="license-header">
               <span class="license-name">Milligram</span>
               <span class="license-badge mit">MIT</span>
             </div>
             <div class="license-details">
               &copy; CJ Patoilo<br>
               <a href="https://github.com/milligram/milligram" rel="nofollow noopener"
                 target="_blank">github.com/milligram/milligram</a>
             </div>
           </div>
        </div>

        <p>Bron data: <a href="https://www.netbeheernederland.nl/toekomstscenarios/regionalisatie-datasets-van-de-netbeheer-nederland-scenarios-editie-2025" target="_blank">Regionalisatie datasets van de Netbeheer Nederland Scenario’s Editie 2025</a>.</p>
        

        <div class="about-disclaimer">
          <p>
            Unless required by applicable law or agreed to in writing, software distributed under these licenses is
            provided on an
            &ldquo;AS IS&rdquo; basis, without warranties or conditions of any kind, either express or
            implied.
          </p>

          <p>
            All rights not explicitly granted by these licenses are reserved by their respective authors.
          </p>
        </div>
      </section>
    </div>
  </div>
`

// Initialize the About modal
function initAboutModal () {
  // Insert modal HTML into the page
  const modalContainer = document.createElement('div')
  modalContainer.innerHTML = aboutModalHTML
  document.body.appendChild(modalContainer.firstElementChild)

  // Set up click-outside-to-close functionality
  window.addEventListener('click', function (event) {
    const modal = document.getElementById('aboutModal')
    if (event.target === modal) {
      hideAboutModal()
    }
  })
}

// Show the About modal
function showAboutModal () {
  const modal = document.getElementById('aboutModal')
  if (modal) {
    modal.style.display = 'block'
  }
}

// Hide the About modal
function hideAboutModal () {
  const modal = document.getElementById('aboutModal')
  if (modal) {
    modal.style.display = 'none'
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAboutModal)
} else {
  initAboutModal()
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showAboutModal, hideAboutModal, initAboutModal}
}
