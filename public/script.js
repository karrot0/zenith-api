document.addEventListener('DOMContentLoaded', function() {
    // Get all endpoint toggles
    const toggles = document.querySelectorAll('.endpoint-toggle');
    
    // Add click event to each toggle
    toggles.forEach(toggle => {
      toggle.addEventListener('click', function() {
        const tester = this.closest('div[id]').querySelector('.endpoint-tester');
        this.classList.toggle('active');
        if (tester.classList.contains('active')) {
          tester.classList.remove('active');
        } else {
          tester.classList.add('active');
        }
      });
    });
    
    // Execute API calls
    const executeButtons = document.querySelectorAll('.execute-btn');
    executeButtons.forEach(button => {
      button.addEventListener('click', async function() {
        let endpoint = this.getAttribute('data-endpoint');
        const tester = this.closest('.endpoint-tester');
        const inputs = tester.querySelectorAll('.param-input');
        
        // Handle different parameter types (path vs query)
        const queryParams = new URLSearchParams();
        
        inputs.forEach(input => {
          const paramName = input.getAttribute('data-param');
          const paramValue = input.value || input.getAttribute('data-default') || '';
          
          if (endpoint.includes(`:${paramName}`)) {
            // Path parameter
            endpoint = endpoint.replace(`:${paramName}`, paramValue);
          } else {
            // Query parameter
            queryParams.append(paramName, paramValue);
          }
        });

        // Add query parameters to endpoint if any exist
        if (queryParams.toString()) {
          endpoint += `?${queryParams.toString()}`;
        }

        const responseContainer = tester.querySelector('.response-container');
        const statusEl = responseContainer.querySelector('.status-code');
        const responseArea = responseContainer.querySelector('.response-area');
        const responseTimeEl = responseContainer.querySelector('.response-time');
        
        responseContainer.classList.remove('hidden');
        responseArea.textContent = 'Loading...';
        
        try {
          const startTime = performance.now();
          const response = await fetch(endpoint);
          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);
          
          const data = await response.json();
          statusEl.textContent = response.status;
          statusEl.classList.add(response.ok ? 'bg-green-800' : 'bg-red-800');
          responseTimeEl.textContent = `Response time: ${responseTime}ms`;
          
          // Create example if applicable
          const exampleHtml = createExampleFromResponse(endpoint, data);
          if (exampleHtml) {
            // Remove existing example if any
            const existingExample = this.closest('[id]').querySelector('.example-section');
            if (existingExample) {
              existingExample.remove();
            }
            // Insert new example before the endpoint tester
            this.closest('.endpoint-tester').insertAdjacentHTML('beforebegin', exampleHtml);
          }
          
          // Format and display JSON response
          formatJsonResponse(responseArea, data);
        } catch (error) {
          statusEl.textContent = 'Error';
          statusEl.classList.add('bg-red-800');
          responseArea.textContent = error.message;
        }
      });
    });
    
    // Function to format JSON with syntax highlighting
    function formatJsonResponse(container, data) {
      if (!data) {
        container.textContent = "No data";
        return;
      }
      
      // Format full data with syntax highlighting - using lazy loading for better performance
      const formatFullResponse = (data) => {
        return JSON.stringify(data, null, 2)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
            function (match) {
              let cls = 'text-blue-400'; // number
              if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                  cls = 'text-indigo-300 font-medium'; // key
                } else {
                  cls = 'text-green-300'; // string
                }
              } else if (/true|false/.test(match)) {
                cls = 'text-yellow-300'; // boolean
              } else if (/null/.test(match)) {
                cls = 'text-red-400'; // null
              }
              return `<span class="${cls}">${match}</span>`;
            });
      };
      
      // Format summary data - with better performance for large objects
      const formatSummary = (data) => {
        // Create a summary view with just the main properties
        const summaryKeys = Object.keys(data).slice(0, 3); // Take first 3 keys
        const summaryData = {};
        
        summaryKeys.forEach(key => {
          if (Array.isArray(data[key])) {
            summaryData[key] = `Array[${data[key].length}]`;
          } else if (typeof data[key] === 'object' && data[key] !== null) {
            summaryData[key] = '{...}';
          } else {
            summaryData[key] = data[key];
          }
        });
        
        if (Object.keys(data).length > 3) {
          summaryData['...'] = `${Object.keys(data).length - 3} more properties`;
        }
        
        return JSON.stringify(summaryData, null, 2)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };
      
      // Create expandable response view with lazy loading
      container.innerHTML = `
        <div class="flex justify-between items-center text-xs mb-2">
          <span class="text-gray-400">Showing response summary</span>
          <button class="expand-btn bg-gray-700 hover:bg-gray-600 text-xs px-2 py-1 rounded" 
                  data-expanded="false">Show full response</button>
        </div>
        <div class="summary-view">${formatSummary(data)}</div>
        <div class="full-view hidden"></div>
      `;
      
      // Add toggle functionality
      const expandBtn = container.querySelector('.expand-btn');
      const summaryView = container.querySelector('.summary-view');
      const fullView = container.querySelector('.full-view');
      
      // Use lazy loading for full response
      expandBtn.addEventListener('click', function() {
        const expanded = this.getAttribute('data-expanded') === 'true';
        if (expanded) {
          // Switch to summary view
          this.textContent = 'Show full response';
          this.setAttribute('data-expanded', 'false');
          summaryView.classList.remove('hidden');
          fullView.classList.add('hidden');
          
          // Clear the full view to save memory
          setTimeout(() => {
            fullView.innerHTML = '';
          }, 300);
        } else {
          // Show loading indicator
          this.textContent = 'Loading...';
          this.disabled = true;
          fullView.innerHTML = '<div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500"></div></div>';
          fullView.classList.remove('hidden');
          summaryView.classList.add('hidden');
          
          // Use setTimeout to prevent UI freeze and allow the spinner to render
          setTimeout(() => {
            // Check if the response is very large (more than 50KB) 
            const jsonSize = JSON.stringify(data).length;
            
            if (jsonSize > 50000) {
              // For very large responses, use chunked rendering
              const keys = Object.keys(data);
              let html = '';
              
              // Handle root level simple properties first
              keys.forEach(key => {
                if (typeof data[key] !== 'object' || data[key] === null) {
                  const value = JSON.stringify(data[key]);
                  const colorClass = typeof data[key] === 'string' ? 'text-green-300' : 
                                    typeof data[key] === 'number' ? 'text-blue-400' :
                                    typeof data[key] === 'boolean' ? 'text-yellow-300' : 'text-red-400';
                  
                  html += `<div class="mb-1"><span class="text-indigo-300 font-medium">"${key}":</span> <span class="${colorClass}">${value}</span></div>`;
                }
              });
              
              // Then handle objects/arrays with a collapsible interface
              keys.forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                  const isArray = Array.isArray(data[key]);
                  const count = isArray ? data[key].length : Object.keys(data[key]).length;
                  html += `
                    <div class="mb-2">
                      <div class="flex items-center cursor-pointer hover:bg-gray-800 rounded p-1" data-key="${key}" onclick="toggleObjectExpand(this)">
                        <span class="text-indigo-300 font-medium">"${key}":</span>
                        <span class="ml-2 text-gray-400">${isArray ? 'Array' : 'Object'}[${count}]</span>
                        <span class="ml-auto text-gray-500">▶</span>
                      </div>
                      <div class="pl-4 border-l border-gray-700 hidden" data-content="${key}"></div>
                    </div>
                  `;
                }
              });
              
              fullView.innerHTML = html;
              
              // Define the toggle function in the global scope
              window.toggleObjectExpand = function(el) {
                const key = el.getAttribute('data-key');
                const contentEl = el.parentNode.querySelector(`[data-content="${key}"]`);
                const arrowEl = el.querySelector('span:last-child');
                
                if (contentEl.classList.contains('hidden')) {
                  contentEl.classList.remove('hidden');
                  arrowEl.textContent = '▼';
                  
                  // Only load content if it's empty
                  if (contentEl.innerHTML.trim() === '') {
                    const objData = data[key];
                    let contentHtml = '';
                    
                    if (Array.isArray(objData)) {
                      objData.forEach((item, idx) => {
                        if (idx < 100) { // Limit to 100 items for very large arrays
                          contentHtml += `<div class="mb-1"><span class="text-indigo-300">${idx}:</span> ${JSON.stringify(item)}</div>`;
                        } else if (idx === 100) {
                          contentHtml += `<div class="text-gray-400">... ${objData.length - 100} more items</div>`;
                        }
                      });
                    } else {
                      Object.keys(objData).forEach(subKey => {
                        contentHtml += `<div class="mb-1"><span class="text-indigo-300">"${subKey}":</span> ${JSON.stringify(objData[subKey])}</div>`;
                      });
                    }
                    
                    contentEl.innerHTML = contentHtml;
                  }
                } else {
                  contentEl.classList.add('hidden');
                  arrowEl.textContent = '▶';
                }
              };
            } else {
              // For smaller responses, render everything at once
              fullView.innerHTML = formatFullResponse(data);
            }
            
            // Update button
            this.textContent = 'Show summary';
            this.setAttribute('data-expanded', 'true');
            this.disabled = false;
          }, 10);
        }
      });
    
    };

    function createExampleFromResponse(endpoint, data) {
      // Handle top-ten endpoint
      if (endpoint === '/api/top-ten' && data?.results?.today?.length) {
        const exampleItem = data.results.today[0]; // Get first item as example
        
        const exampleHtml = `
          <div class="example-section mt-6">
            <h3 class="example-section-title">
              <i class="fa fa-lightbulb-o"></i> Live Example from Response
            </h3>
            
            <div class="example-carousel">
              <div class="carousel-slides">
                <div class="carousel-slide">
                  <div class="example-card">
                    <div class="example-card-image" style="background-image: url('${exampleItem.poster}');">
                    </div>
                    <div class="example-card-content">
                      <div class="example-card-title">${exampleItem.title}</div>
                      <div class="example-card-subtitle">First item from today's rankings</div>
                      <div class="example-card-data">
                        <table class="variable-table">
                          <tr class="variable-row">
                            <td class="variable-name">id</td>
                            <td class="variable-value">"${exampleItem.id}"</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">data_id</td>
                            <td class="variable-value">"${exampleItem.data_id}"</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">number</td>
                            <td class="variable-value">"${exampleItem.number}"</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">japanese_title</td>
                            <td class="variable-value">"${exampleItem.japanese_title}"</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">tvInfo</td>
                            <td class="variable-value">${JSON.stringify(exampleItem.tvInfo)}</td>
                          </tr>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        return exampleHtml;
      }

      // Handle anime info endpoint
      if (endpoint.startsWith('/api/info') && data?.results?.data) {
        const info = data.results.data;
        const exampleHtml = `
          <div class="example-section mt-6">
            <h3 class="example-section-title">
              <i class="fa fa-lightbulb-o"></i> Live Example from Response
            </h3>
            
            <div class="example-carousel">
              <div class="carousel-slides">
                <div class="carousel-slide">
                  <div class="example-card">
                    <div class="example-card-image" style="background-image: url('${info.poster}');">
                    </div>
                    <div class="example-card-content">
                      <div class="example-card-title">${info.title}</div>
                      <div class="example-card-subtitle">Basic Anime Information</div>
                      <div class="example-card-data">
                        <table class="variable-table">
                          <tr class="variable-row">
                            <td class="variable-name">id</td>
                            <td class="variable-value">"${info.id}"</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">adultContent</td>
                            <td class="variable-value">${info.adultContent}</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">malScore</td>
                            <td class="variable-value">${info.animeInfo["MAL Score"] || 'N/A'}</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">genres</td>
                            <td class="variable-value">${JSON.stringify(info.animeInfo.Genres)}</td>
                          </tr>
                          <tr class="variable-row">
                            <td class="variable-name">tvInfo</td>
                            <td class="variable-value">${JSON.stringify(info.animeInfo.tvInfo)}</td>
                          </tr>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        return exampleHtml;
      }
    }
});