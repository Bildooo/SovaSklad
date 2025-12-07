const PUB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSu50osqROnaSgf6c6cM6O83Bz_0OMFBZqadVX3Sb8BfoUfCTo8nwHy-9hAJYUnCdvNOfylKUa-pIu5/pubhtml';

const searchInput = document.getElementById('searchInput');
const container = document.getElementById('container');
const loading = document.getElementById('loading');

let allData = [];

// Initialize
fetchData();

searchInput.addEventListener('input', (e) => {
    filterAndRender(e.target.value);
});

async function fetchData() {
    loading.style.display = 'block';
    container.innerHTML = '';

    try {
        let text = '';
        try {
            const response = await fetch(PUB_SHEET_URL);
            text = await response.text();
        } catch (e) {
            console.log('Direct fetch failed (likely CORS), trying proxy...');
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(PUB_SHEET_URL);
            const response = await fetch(proxyUrl);
            text = await response.text();
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        let table = doc.querySelector('table.waffle');
        
        if (!table) {
            const sheetUrl = PUB_SHEET_URL + '/sheet?headers=false&gid=0';
             try {
                let sheetResponse;
                try {
                     sheetResponse = await fetch(sheetUrl);
                } catch(e) {
                     const sheetProxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(sheetUrl);
                     sheetResponse = await fetch(sheetProxyUrl);
                }
                const sheetText = await sheetResponse.text();
                const sheetDoc = parser.parseFromString(sheetText, 'text/html');
                table = sheetDoc.querySelector('table.waffle');
            } catch (e) {
                console.error("Failed to fetch inner sheet", e);
            }
        }

        if (!table) {
            throw new Error('Tabulka nenalezena v HTML.');
        }

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        // Determine start row (skip header)
        let startRowIndex = 0;
        const firstRowCells = rows[0].querySelectorAll('td');
        if (firstRowCells.length > 0 && firstRowCells[0].textContent.trim().toLowerCase().includes('fotka')) {
            startRowIndex = 1;
        }

        allData = rows.slice(startRowIndex).map(row => {
            const cells = row.querySelectorAll('td');
            
            // Helper to get text
            const getText = (idx) => cells[idx] ? cells[idx].textContent.trim() : '';
            
            // Helper to get Image
            const getImg = (idx) => {
                const cell = cells[idx];
                if (!cell) return '';
                const img = cell.querySelector('img');
                return img ? img.src : '';
            };

            return {
                image: getImg(0),       // Col 0: Fotka
                name: getText(1),       // Col 1: Nazev
                description: getText(2), // Col 2: Popis (NEW)
                branch: getText(3),     // Col 3: Pobocka (shifted)
                pieces: getText(4)      // Col 4: Kusy (shifted)
            };
        }).filter(item => item.name); // Filter out empty rows

        // Initial render
        filterAndRender('');
        
    } catch (error) {
        console.error('Error fetching data:', error);
        container.innerHTML = '<div class="no-results">Chyba při načítání dat. Ujistěte se, že je tabulka publikována na webu.</div>';
    } finally {
        loading.style.display = 'none';
    }
}

function filterAndRender(query) {
    const lowerQuery = query.toLowerCase();
    
    const filtered = allData.filter(item => {
        // Added description to search
        const combined = `${item.name} ${item.description} ${item.branch} ${item.pieces}`.toLowerCase();
        return combined.includes(lowerQuery);
    });

    render(filtered);
}

function render(items) {
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<div class="no-results">Žádné položky nenalezeny.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        let imgHtml = '';
        if (item.image) {
             imgHtml = `<img src="${item.image}" alt="${item.name}" class="item-image">`;
        } else {
            imgHtml = `<div class="item-image" style="display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 0.9em; background: #eee;">Bez obrázku</div>`;
        }

        // Add description block if exists
        const descHtml = item.description ? `<span class="item-desc">${item.description}</span>` : '';

        card.innerHTML = `
            ${imgHtml}
            <div class="item-details">
                <span class="item-title">${item.name || 'Bez názvu'}</span>
                ${descHtml}
                <div class="item-info">
                    <span class="item-branch">${item.branch || ''}</span>
                    <span class="item-pieces">${item.pieces || '0'} ks</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}
