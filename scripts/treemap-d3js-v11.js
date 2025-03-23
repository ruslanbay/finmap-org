class Treemap {
    constructor(containerId, rawData) {
        this.rawData = rawData;
        // Add column index mapping
        this.columnIndex = {};
        // Initialize container and canvas
        this.container = document.getElementById(containerId);
        this.tooltip = document.getElementById('tooltip');
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
            this.hideTooltip();
        });

        // Pathbar navigation
        this.pathbar.addEventListener('click', (event) => {
            const index = parseInt(event.target.closest('span').dataset.index);
            if (!isNaN(index)) this.drillTo(index);
        });

        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
            const node = this.findNodeAtPoint(x, y);
            
            if (node) {
                this.canvas.style.cursor = 'pointer';
                this.showTooltip(node, event);
            } else {
                this.canvas.style.cursor = 'default';
                this.hideTooltip();
            }
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

    getCardInfo(node, details = "verbose") {
        const productId = node.data.ticker;
        const productRawData = this.rawData.find(item => item.productId === productId);
    
        const customAttributes = {
          name: node.data.name,
          marketPrice: node.value,
        };
    
        if (node.children && node.children.length) {
          customAttributes.nodeChildrenLength = node.children.length;
        }
    
        if (productRawData && productRawData.customAttributes) {
          Object.assign(customAttributes, productRawData.customAttributes);
        }
    
        const cardInfo = formatCardInfo(customAttributes, details);
        return cardInfo;
    }

    async renderFromNode(node) {
        if (!node?.data) return;

        if (!node.data.children?.length) {
            const cardInfo = this.getCardInfo(node, "verbose");
            const productId = node.data.ticker;
            updateOverlayWidget(cardInfo, productId);
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
                let imageSrc = 'https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/previews/pokemon/default.webp';
                const defaultImageSrc = imageSrc;

                // Determine image source based on size
                if (width > 60 || height > 90) { // (width > 100 || height > 150) {
                    imageSrc = `https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/previews/pokemon/${roundedProductId}/${productId}.webp`;
                }

                // Load image asynchronously
                const image = await loadImage(imageSrc).catch(() => {
                    // Fallback to default image if specific image fails to load
                    return loadImage(`${defaultImageSrc}`);
                });
                
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
    
        // Update the pathbar
        this.updatePathbar();
    
        // Render the target node
        this.renderFromNode(node);
    }
    
    async drillTo(index) {
        if (index >= 0 && index < this.path.length) {
            this.path = this.path.slice(0, index + 1);
    
            this.updatePathbar();
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
            const parentNode = this.nodesMap.get(parentSector);
        
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

    // Tooltip methods
    showTooltip(node, event) {
        if (!node?.data || !event) {
            return;
        }
    
        const tooltip = d3.select(this.tooltip);
        const formatNumber = d3.format(',.2f');

        const tooltipContent = this.getCardInfo(node, "short");
    
        tooltip
            .style('display', 'block')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`)
            .html(tooltipContent);
    }
    
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hideTooltip() {
        d3.select(this.tooltip).style('display', 'none');
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
            
        .overlay {
            position: fixed;
            aspect-ratio: 630 / 880;
            height: 88%;
            max-height: 880px;
            display: flex;
            visibility: hidden;
            opacity: 1.0;
            background-color: #f0f0f0;
            padding: 10px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }

        .cardInfoDiv {
            width: 100%;
            aspect-ratio: 630 / 880;
            background: white;
            opacity: 0.9;
            overflow-y: auto;
            padding: 16px;
        }

        #buyButton {
            top: 15px;
            right: 128px;
            width: 87px;
            border-radius: 10px;
            font-style: italic;
        }

        #infoButton {
            top: 15px;
            right: 70px;
            font-style: italic;
        }
        
        #closeButton {
            top: 15px;
            right: 15px;
        }
            
        .button {
            position: absolute;
            font-size: 48px;
            font-weight: normal;
            font-family: Georgia;
            background: #aaa1a1;
            border: none;
            cursor: pointer;
            opacity: 0.7;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            justify-content: center;
            align-items: center;
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


async function updateOverlayWidget(cardInfo, productId) {
    let overlayDiv = document.getElementById("overlay");
    let cardInfoDiv = document.getElementById("cardInfoDiv");
    let infoButton = document.getElementById("infoButton");
    let buyButton = document.getElementById("buyButton");
    let closeButton = document.getElementById("closeButton");
  
    const roundedProductId = Math.floor(productId / 1000) * 1000;
    const imageSrc = `https://raw.githubusercontent.com/finmap-org/data-tcg/refs/heads/main/images/pokemon/${roundedProductId}/${productId}.jpg`;
  
    if (!overlayDiv) {
      overlayDiv = createOverlayDiv();
      overlayDiv.innerHTML = "";
      cardInfoDiv = createCardInfoDiv(cardInfo);
      infoButton = createButton("infoButton", "i", "button");
      closeButton = createButton("closeButton", "×", "button");
      const buyLink = document.createElement('a');
      buyLink.id = "buyButton";
      buyLink.href = `https://www.tcgplayer.com/product/${productId}`;
      buyLink.target = "_blank";
      buyLink.textContent = "buy";
  
      overlayDiv.appendChild(cardInfoDiv);
      overlayDiv.appendChild(buyLink);
      overlayDiv.appendChild(infoButton);
      overlayDiv.appendChild(closeButton);
  
      closeButton.addEventListener("click", () => {
        overlayDiv.style.visibility = "hidden";
        cardInfoDiv.style.visibility = "hidden";
      });
  
      document.body.appendChild(overlayDiv);
    }
  
    cardInfoDiv.innerHTML = cardInfo;
  
    const buyLink = overlayDiv.querySelector('#buyButton');
    buyLink.href = `https://www.tcgplayer.com/product/${productId}`;
  
    infoButton.removeEventListener('click', toggleVisibility);
  
    infoButton.addEventListener("click", () => toggleVisibility(cardInfoDiv, buyButton, infoButton, closeButton));
  
    overlayDiv.style.visibility = "visible";
    cardInfoDiv.style.visibility = "visible";
  
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      overlayDiv.style.backgroundImage = `url(${imageSrc})`;
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${imageSrc}`);
      overlayDiv.style.backgroundImage = 'none';
      overlayDiv.style.backgroundColor = '#41475d';
    };
  }

function createOverlayDiv() {
    const div = document.createElement("div");
    div.id = "overlay";
    div.className = "overlay";
    return div;
}

function createCardInfoDiv(cardInfo) {
    const div = document.createElement("div");
    div.id = "cardInfoDiv";
    div.className = "cardInfoDiv";
    div.innerHTML = cardInfo;
    return div;
}

function createButton(id, text, className) {
    const button = document.createElement("button");
    button.id = id;
    button.className = className;
    button.textContent = text;
    return button;
}

function toggleVisibility(cardInfoDiv, buyButton, infoButton, closeButton) {
    if (cardInfoDiv.style.visibility === "hidden") {
        cardInfoDiv.style.visibility = "visible";
        buyButton.style.background = "#aaa1a1";
        infoButton.style.background = "#aaa1a1";
        closeButton.style.background = "#aaa1a1";
    } else {
        cardInfoDiv.style.visibility = "hidden";
        buyButton.style.background = "white";
        infoButton.style.background = "white";
        closeButton.style.background = "white";
    }
}


function formatCardInfo(cardInfo, details = "verbose") {
    const releaseDate = cardInfo.releaseDate ? cardInfo.releaseDate.split("T")[0] : "N/A";
    const formattedMarketPrice = cardInfo.marketPrice
    ? `$${cardInfo.marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "N/A";

    let html = `
        <p><b>${cardInfo.name || "Unknown"}</b></p>
        <p><b>MARKET PRICE</b> ${formattedMarketPrice || "N/A"}</p>
        <p><b>RELEASE DATE</b> ${releaseDate}</p>
    `;

    switch (details) {
        case "short":
            if (cardInfo.nodeChildrenLength) {
                html = `${html}
                <div style="margin-top: 5px; color: #8BE9FD;">
                    Click to view ${cardInfo.nodeChildrenLength} items
                </div>`;
            }
            else {
                html = `${html}
                <div style="margin-top: 5px; color: #8BE9FD;">
                    'Click to view details'
                </div>`;
            }
            break;
        case "verbose":
        default:
            html = `${html}
            <p>${cardInfo.number} | ${cardInfo.rarityDbName || ""}</p>
            <p>${cardInfo.description || ""}</p>
            <p>${cardInfo.flavorText || ""}</p>
            <p>
              <b>HP</b> ${cardInfo.hp || "N/A"}<br>
              <b>ENERGY TYPE</b> ${cardInfo.energyType || "N/A"}<br>
              <b>STAGE</b> ${cardInfo.stage || "N/A"}
            </p>
            <p>
              <b>RESISTANCE</b> ${cardInfo.resistance || "N/A"}<br>
              <b>WEAKNESS</b> ${cardInfo.weakness || "N/A"}
            </p>
            <p><b>ATTACKS</b></p>
            <ul>
                ${cardInfo.attack1 ? `<li>${cardInfo.attack1}</li>` : ""}
                ${cardInfo.attack2 ? `<li>${cardInfo.attack2}</li>` : ""}
                ${cardInfo.attack3 ? `<li>${cardInfo.attack3}</li>` : ""}
                ${cardInfo.attack4 ? `<li>${cardInfo.attack4}</li>` : ""}
            </ul>`;
    }

    return html;
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