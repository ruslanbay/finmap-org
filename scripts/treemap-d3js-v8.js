class Treemap {
    constructor(containerId, rawData) {
        this.rawData = rawData;
        // Add column index mapping
        this.columnIndex = {};
        // Initialize container and canvas
        this.container = document.getElementById(containerId);
        this.setupCanvas();
        
        // Initialize data properties
        this.nodes = [];
        this.currentRoot = null;
        this.path = [];
        
        // Create minimal pathbar
        this.setupPathbar();
        
        // Bind events
        this.bindEvents();

        // Initial size calculation
        this.updateDimensions();

        // Add resize handler
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);

        // Cache for computed values
        this.cache = {
            hierarchy: null,
            lastWidth: 0,
            lastHeight: 0
        };

        // Resize observer instead of window.resize
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.container);

        // Add parent references to make path building easier
        this.nodesMap = new Map();
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
    }

    async handleResize(entries) {
        if (!entries?.length) return;
        
        // Use requestAnimationFrame for smooth resizing
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(() => {
            const entry = entries[0];
            const newWidth = entry.contentRect.width;
            const newHeight = entry.contentRect.height - 40; // Subtract pathbar

            // Only update if dimensions actually changed
            if (newWidth !== this.cache.lastWidth || 
                newHeight !== this.cache.lastHeight) {
                
                this.cache.lastWidth = newWidth;
                this.cache.lastHeight = newHeight;
                
                this.updateDimensions(newWidth, newHeight);
                
                if (this.currentRoot) {
                    this.updateLayout();
                }
            }
        });
    }

    async updateLayout() {
        if (!this.cache.hierarchy) {
            this.cache.hierarchy = d3.hierarchy(this.currentRoot.data)
                .sum(d => d.type === 'sector' ? 0 : d.value)
                .sort((a, b) => b.value - a.value);
        }
    
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .paddingTop(d => {
                if (d === this.cache.hierarchy || !d.children) return 0;
                return 24;
            })
            .paddingRight(1)
            .paddingBottom(1)
            .paddingLeft(1)
            .round(true);
    
        treemap(this.cache.hierarchy);
        this.nodes = this.cache.hierarchy.descendants();
        
        this.render();
    }

    // Clean up when no longer needed
    destroy() {
        this.resizeObserver.disconnect();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }

    setupCanvas() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight - 40; // Subtract pathbar height
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '40px';
        this.canvas.style.left = '0';
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        this.container.appendChild(this.canvas);
    }

    setupPathbar() {
        this.pathbar = document.createElement('div');
        this.pathbar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: #333;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-family: PokemonSolid;
            letter-spacing: 0.1em;
        `;
        this.container.appendChild(this.pathbar);
    }

    bindEvents() {
        // Click handling for drill-down
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const node = this.findNodeAtPoint(x, y);
            if (node) this.drillDown(node);
        });

        // Pathbar navigation
        this.pathbar.addEventListener('click', (event) => {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) this.drillTo(index);
        });
    }

    // Update findNodeAtPoint to handle header areas
    findNodeAtPoint(x, y) {
        const HEADER_HEIGHT = 24;
        return this.nodes.find(node => {
            if (!node.parent) return false; // Skip root node
            
            if (node.children) {
                // For parent nodes, only check header area
                return x >= node.x0 && 
                       x <= node.x1 && 
                       y >= node.y0 && 
                       y <= node.y0 + HEADER_HEIGHT;
            } else {
                // For leaf nodes, check entire area
                return x >= node.x0 && 
                       x <= node.x1 && 
                       y >= node.y0 && 
                       y <= node.y1;
            }
        });
    }

    async renderLeafDetails(node) {
        // Add raw data details if available
        const productId = node.data.ticker;
        const productRawData = this.rawData.find(item => item.productId == productId);
        const customAttributesJson = productRawData ? productRawData.customAttributes : null;
        
        if (customAttributesJson) {
            const customAttributes = Object.entries(customAttributesJson);
            const contentTable = createContentTable(customAttributes);
            await updateOverlayWidget("overlay", productId, contentTable);
        }
    }

    async renderFromNode(node) {
        if (!node?.data) return;

        if (!node.data.children?.length) {
            this.renderLeafDetails(node);
            return;
        }
        
        this.currentRoot = node;
        
        // Clear cache when switching nodes
        this.cache.hierarchy = null;
        
        // Create new hierarchy for new node
        this.cache.hierarchy = d3.hierarchy(node.data)
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);
    
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .paddingTop(d => {
                // No padding for root node and leaf nodes
                if (d === this.cache.hierarchy || !d.children) return 0;
                // Add padding only for parent nodes
                return 24;
            })
            .paddingRight(1)
            .paddingBottom(1)
            .paddingLeft(1)
            .round(true);
    
        treemap(this.cache.hierarchy);
        this.nodes = this.cache.hierarchy.descendants();
        
        this.updatePathbar();
        this.render();
    }

    async render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw nodes in correct order (back to front)
        this.nodes.forEach(node => {
            if (!node.parent) return; // Skip root node
            
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
            
            if (node.children) {
                // Parent node
                
                // Draw main area
                this.ctx.fillStyle = '#2C3E50';
                this.ctx.fillRect(node.x0, node.y0, width, height);
                
                // Draw header
                this.ctx.fillStyle = '#34495E';
                this.ctx.fillRect(node.x0, node.y0, width, 24);
                
                // Draw header text
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textBaseline = 'middle';
                const text = `${node.data.name}`;
                const truncatedText = this.getTruncatedText(text, width - 25);
                this.ctx.fillText(
                    truncatedText,
                    node.x0 + 4,
                    node.y0 + 12
                );
                
            } else {
                // Leaf node
                this.renderLeafNode(node, width, height);
            }
            
            // Draw borders
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(node.x0, node.y0, width, height);
        });
    }

    async renderLeafNode(node, width, height) {
        // Draw background color first (fallback)
        this.ctx.fillStyle = '#41475d';
        this.ctx.fillRect(node.x0, node.y0, width, height);
        
        // Only proceed if there's enough space
        if (width > 30 || height > 45) {
            this.renderNodeText(node, width, height);

            try {
                // Create a Promise for image loading
                const loadImage = (src) => {
                    return new Promise((resolve, reject) => {
                        const image = new Image();
                        image.onload = () => resolve(image);
                        image.onerror = reject;
                        image.src = src;
                    });
                };
    
                let productId = node.data.ticker;
                let roundedProductId = Math.floor(productId / 1000) * 1000;
                let imageSrc = 'https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/previews/pokemon/default.png';

                // Determine image source based on size
                if (width > 60 || height > 90) { // (width > 100 || height > 150) {
                    imageSrc = `https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/previews/pokemon/${roundedProductId}/${productId}.webp`;
                }

                // Load image asynchronously
                const image = await loadImage(imageSrc);
                
                // Calculate scaling to maintain aspect ratio while filling width
                const imageAspect = image.width / image.height;
                const nodeAspect = width / height;
                
                let sx = 0, sy = 0, sWidth = image.width, sHeight = image.height;
                
                if (imageAspect > nodeAspect) {
                    // Image is wider than node - crop sides
                    sWidth = Math.floor(image.height * nodeAspect);
                    sx = Math.floor((image.width - sWidth) / 2);
                } else {
                    // Image is taller than node - crop top/bottom
                    sHeight = Math.floor(image.width / nodeAspect);
                    sy = 0; // Math.floor((image.height - sHeight) / 2);
                }
                
                // Draw the image
                this.ctx.drawImage(
                    image,
                    sx, sy, sWidth, sHeight,  // Source rectangle
                    node.x0, node.y0, width, height  // Destination rectangle
                );
            
                // Render text again on top of the image
                this.renderNodeText(node, width, height);
            } catch (error) {
                console.error(`Failed to load image for node:`, error);
            }
        }
    }

    renderNodeText(node, width, height) {
        // Calculate font size based on node dimensions
        const fontSize = Math.min(
            Math.max(width / 10, 8), 
            Math.min(height / 2, 48)
        );
    
        // Add semi-transparent background for better text readability
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(node.x0, node.y0, width, height);
    
        // Draw text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textBaseline = 'middle';
        
        const text = `${node.data.name}<br>$${d3.format(',.2f')(node.value)}`;
            // Split the text into lines and draw each line separately
            const lines = text.split('<br>');
            const lineHeight = fontSize * 1.0;
            for (let i = 0; i < lines.length; i++) {
                const truncatedText = this.getTruncatedText(lines[i], width - 6);
                this.ctx.fillText(
                    truncatedText,
                    node.x0 + 3,
                    node.y0 + (i * lineHeight) + (height / 2)
                );
            }
    }

    getTruncatedText(text, maxWidth) {
        let truncated = text;
        this.ctx.save();
        
        while (this.ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -1);
        }
        
        this.ctx.restore();
        return truncated !== text ? truncated + '...' : truncated;
    }

    updatePathbar() {
        this.pathbar.innerHTML = this.path
            .map((node, index) => `
                <span 
                    style="cursor: pointer; padding: 5px 10px;"
                    data-index="${index}"
                >
                    ${node.data.name}
                    ${index < this.path.length - 1 ? ' >' : ''}
                </span>
            `)
            .join('');
    }

    async drillDown(node) {
        if (!node || this.currentRoot === node) return;

        // Build complete path from node to root
        const fullPath = [];
        let currentNode = node;
        
        // Traverse up the hierarchy to build the path
        while (currentNode) {
            fullPath.unshift(currentNode);
            currentNode = currentNode.parent;
        }
        
        // Update path with the full hierarchy
        this.path = fullPath;
        
        // Render the target node
        this.renderFromNode(node);
    }

    async drillTo(index) {
        if (index >= 0 && index < this.path.length) {
            this.path = this.path.slice(0, index + 1);
            this.renderFromNode(this.path[index]);
        }
    }

    transformData(securitiesData) {
        if (!securitiesData?.securities?.columns || !securitiesData?.securities?.data) {
            throw new Error('Invalid securities data format');
        }
    
        const { columns, data } = securitiesData.securities;
        
        // Set up column indices
        this.setupColumnIndices(columns);
        
        // Find and validate root node
        const rootRow = this.findRootNode(data);
        
        // Build node hierarchy
        const { root } = this.buildNodeHierarchy(rootRow, data);
        
        return root;
    }
    
    setupColumnIndices(columns) {
        columns.forEach((col, idx) => this.columnIndex[col] = idx);
    }
    
    createNode(row) {
        return {
            name: row[this.columnIndex.nameEng],
            value: row[this.columnIndex.type] !== 'sector' ? 
                parseFloat(row[this.columnIndex.marketCap]) || 0 : 0,
            type: row[this.columnIndex.type],
            sector: row[this.columnIndex.sector],
            ticker: row[this.columnIndex.ticker],
            industry: row[this.columnIndex.industry],
            exchange: row[this.columnIndex.exchange],
            nestedItemsCount: parseInt(row[this.columnIndex.nestedItemsCount]) || 0,
            rawData: row
        };
    }
    
    findRootNode(data) {
        const rootRow = data.find(row => row[this.columnIndex.sector] === '');
        if (!rootRow) {
            throw new Error('Root node not found in data');
        }
        return rootRow;
    }
    
    buildNodeHierarchy(rootRow, data) {
        this.nodesMap.clear();
        
        // Create root node
        const root = {
            ...this.createNode(rootRow),
            children: [],
            parent: null  // Add parent reference
        };
        this.nodesMap.set(rootRow[this.columnIndex.ticker], root);
    
        // Create all nodes first
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            if (ticker !== rootRow[this.columnIndex.ticker]) {
                this.nodesMap.set(ticker, {
                    ...this.createNode(row),
                    children: [],
                    parent: null  // Will set correct parent in next step
                });
            }
        });
    
        // Build hierarchy with parent references
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            const parentSector = row[this.columnIndex.sector];
            
            if (ticker === rootRow[this.columnIndex.ticker]) return;
    
            const node = this.nodesMap.get(ticker);
            const parentNode = Array.from(this.nodesMap.values())
                .find(n => n.ticker === parentSector);
    
            if (parentNode) {
                parentNode.children.push(node);
                node.parent = parentNode;  // Set parent reference
            } else if (parentSector !== '') {
                root.children.push(node);
                node.parent = root;  // Set parent reference
            }
        });
    
        return { root, nodesMap: this.nodesMap };
    }
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
        #container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
        }
        
        @font-face {
            font-family: 'PokemonHollow';
            src: url('styles/PokemonHollow.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'PokemonSolid';
            src: url('styles/PokemonSolid.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
    </style>
`);


async function updateOverlayWidget(divName, productId, contentTable) {
    let overlayDiv = document.getElementById(divName);
    let infoButton = document.getElementById("infoButton");
    let closeButton = document.getElementById("closeButton");

    let roundedProductId = Math.floor(productId / 1000) * 1000;
    let imageSrc = `https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/pokemon/${roundedProductId}/${productId}.jpg`;

    if (!overlayDiv) {
        overlayDiv = document.createElement("div");
        overlayDiv.id = divName;
        overlayDiv.style.position = "fixed";
        overlayDiv.style.aspectRatio = "630 / 880";
        overlayDiv.style.height = "88%";
        overlayDiv.style.maxHeight = "880px";
        overlayDiv.style.display = "flex";
        overlayDiv.style.visibility = "hidden";
        overlayDiv.style.opacity = "1.0";
        overlayDiv.style.backgroundColor = "#f0f0f0";
        overlayDiv.style.padding = "10px";
        overlayDiv.style.top = "50%";
        overlayDiv.style.left = "50%";
        overlayDiv.style.transform = "translate(-50%, -50%)";
        overlayDiv.style.backgroundSize = "cover";
        overlayDiv.style.backgroundPosition = "center";
        overlayDiv.style.backgroundRepeat = "no-repeat";
        overlayDiv.innerHTML = "";

        infoButton = document.createElement("button");
        infoButton.id = "infoButton";
        infoButton.textContent = "i";
        infoButton.style.position = "absolute";
        infoButton.style.top = "10px";
        infoButton.style.left = "10px";
        infoButton.style.fontSize = "48px";
        infoButton.style.fontWeight = "bold";
        infoButton.style.fontStyle = "italic";
        infoButton.style.background = "white";
        infoButton.style.border = "none";
        infoButton.style.cursor = "pointer";
        infoButton.style.opacity = "0.7";
        infoButton.style.borderRadius = "50%";
        infoButton.style.width = "48px";
        infoButton.style.height = "48px";
        infoButton.style.display = "flex";
        infoButton.style.justifyContent = "center";
        infoButton.style.alignItems = "center";

        overlayDiv.appendChild(infoButton);

        closeButton = document.createElement("button");
        closeButton.id = "closeButton";
        closeButton.textContent = "×";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.fontSize = "48px";
        closeButton.style.fontWeight = "bold";
        closeButton.style.background = "white";
        closeButton.style.border = "none";
        closeButton.style.cursor = "pointer";
        closeButton.style.opacity = "0.7";
        closeButton.style.borderRadius = "50%";
        closeButton.style.width = "48px";
        closeButton.style.height = "48px";
        closeButton.style.display = "flex";
        closeButton.style.justifyContent = "center";
        closeButton.style.alignItems = "center";

        overlayDiv.appendChild(closeButton);

        closeButton.addEventListener("click", function() {
            overlayDiv.style.visibility = "hidden";
        });

        infoButton.addEventListener("click", function() {
            if (contentTable.style.display === "none") {
                contentTable.style.display = "table";
            } else {
                contentTable.style.display = "none";
            }
        });

        document.body.appendChild(overlayDiv);
    }

    overlayDiv.innerHTML = "";
    overlayDiv.appendChild(contentTable);
    overlayDiv.appendChild(infoButton);
    overlayDiv.appendChild(closeButton);
    overlayDiv.style.visibility = "visible";

    // let table = document.getElementById("table");
    // infoButton.addEventListener("click", function() {
    //     if (table.style.display === "none") {
    //         table.style.display = "table";
    //     } else {
    //         table.style.display = "none";
    //     }
    // });

    const img = new Image();
    img.src = imageSrc;
    img.onload = function() {
        overlayDiv.style.backgroundImage = `url(${imageSrc})`;
    };
}


function createContentTable(content) {
    // Create the table element
    const table = document.createElement('table');
    table.id = "table";
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.visibility = 'visible';
    table.style.background = "white";
    table.style.opacity = "0.7";

    // Create the table header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const labelHeader = document.createElement('th');
    const valueHeader = document.createElement('th');

    labelHeader.textContent = 'Label';
    valueHeader.textContent = 'Value';

    // Style headers
    labelHeader.style.textAlign = 'left';
    labelHeader.style.padding = '8px';
    labelHeader.style.borderBottom = '1px solid #ddd';
    valueHeader.style.textAlign = 'left';
    valueHeader.style.padding = '8px';
    valueHeader.style.borderBottom = '1px solid #ddd';

    headerRow.appendChild(labelHeader);
    headerRow.appendChild(valueHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create the table body
    const tbody = document.createElement('tbody');

    content.forEach(([label, value]) => {
        if (value !== null && value !== undefined) {
            const row = document.createElement('tr');

            // Create label cell
            const labelCell = document.createElement('td');
            labelCell.textContent = label;
            labelCell.style.padding = '8px';
            labelCell.style.borderBottom = '1px solid #ddd';

            // Create value cell
            const valueCell = document.createElement('td');
            valueCell.innerHTML = String(value); // Allow HTML content
            valueCell.style.padding = '8px';
            valueCell.style.borderBottom = '1px solid #ddd';

            row.appendChild(labelCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        }
    });

    table.appendChild(tbody);

    return table;
}


function createLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
  `;
  loadingDiv.innerHTML = `<div>Loading data...</div>`;
  return loadingDiv;
}


async function renderTreemap() {
    // fetch raw datafile
    let rawDatafile;
    try {
        const url = 'https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/marketdata/raw/pokemon.json';
        const response = await fetch(url);
        rawDatafile = await response.json();
    } catch (error) {
        console.error('Error loading raw datafile:', error);
    }


    const treemap = new Treemap('container', rawDatafile.results[0].results);
    // const loadingDiv = createLoadingIndicator();
    // treemap.container.appendChild(loadingDiv);


    // fetch and render treemap datafile
    try {
        const url = 'https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/marketdata/pokemon.json';
        const response = await fetch(url);
        const data = await response.json();
        
        const transformedData = treemap.transformData(data);
        const root = d3.hierarchy(transformedData)
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);
        
        treemap.path = [root];
        treemap.renderFromNode(root);
    } catch (error) {
        console.error('Error loading or processing data:', error);
    } finally {
        // treemap.container.removeChild(loadingDiv);
    }
}

renderTreemap();
