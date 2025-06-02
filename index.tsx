
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface VisitData {
    clientName: string;
    visitDate: string; // Stored as YYYY-MM-DD
    technicianName: string;
    description: string;
}

interface Block {
    index: number;
    timestamp: number;
    data: VisitData | string; // Genesis block can have string data
    previousHash: string;
    hash: string;
}

// Represents a visit associated with a client, including block context
interface ClientVisitEntry {
    originalVisitData: VisitData;
    blockTimestamp: number;
    blockIndex: number;
}

class Blockchain {
    public chain: Block[];

    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    private createGenesisBlock(): Block {
        const timestamp = Date.now();
        const index = 0;
        const data = "Genesis Block";
        const previousHash = "0";
        const hash = this.calculateHash(index, previousHash, timestamp, data);
        return { index, timestamp, data, previousHash, hash };
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    private calculateHash(index: number, previousHash: string, timestamp: number, data: VisitData | string): string {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const inputString = `${index}${previousHash}${timestamp}${dataString}`;
        let hashVal = 0;
        for (let i = 0; i < inputString.length; i++) {
            const char = inputString.charCodeAt(i);
            hashVal = ((hashVal << 5) - hashVal) + char;
            hashVal |= 0; 
        }
        return Math.abs(hashVal).toString(16).padStart(8, '0');
    }

    public addBlock(data: VisitData): Block {
        const latestBlock = this.getLatestBlock();
        const newIndex = latestBlock.index + 1;
        const newTimestamp = Date.now();
        const newHash = this.calculateHash(newIndex, latestBlock.hash, newTimestamp, data);
        const newBlock: Block = {
            index: newIndex,
            timestamp: newTimestamp,
            data: data,
            previousHash: latestBlock.hash,
            hash: newHash,
        };
        this.chain.push(newBlock);
        return newBlock;
    }
}

const blockchain = new Blockchain();
const clientsData = new Map<string, ClientVisitEntry[]>();
let currentView: 'clientsList' | 'clientVisits' = 'clientsList';
let selectedClientName: string | null = null;

const dataDisplayContainer = document.getElementById('data-display-container') as HTMLDivElement;
const visitForm = document.getElementById('visit-form') as HTMLFormElement;
const clientNameInput = document.getElementById('clientName') as HTMLInputElement;
const visitDateInput = document.getElementById('visitDate') as HTMLInputElement;
const technicianNameInput = document.getElementById('technicianName') as HTMLInputElement;
const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;

function updateClientsDataMap(visitData: VisitData, blockTimestamp: number, blockIndex: number): void {
    const { clientName } = visitData;
    const clientEntry: ClientVisitEntry = { originalVisitData: visitData, blockTimestamp, blockIndex };

    if (clientsData.has(clientName)) {
        clientsData.get(clientName)?.push(clientEntry);
        // Sort visits by timestamp (most recent first) for consistency
        clientsData.get(clientName)?.sort((a, b) => b.blockTimestamp - a.blockTimestamp);
    } else {
        clientsData.set(clientName, [clientEntry]);
    }
}

function renderClientsListDisplay(): void {
    if (!dataDisplayContainer) return;
    dataDisplayContainer.innerHTML = ''; // Clear previous content

    if (clientsData.size === 0) {
        const noClientsMsg = document.createElement('p');
        noClientsMsg.textContent = 'Nenhum cliente registrado ainda. Adicione uma visita técnica para começar.';
        noClientsMsg.classList.add('no-data-message');
        dataDisplayContainer.appendChild(noClientsMsg);
        return;
    }

    const sortedClientNames = Array.from(clientsData.keys()).sort((a, b) => a.localeCompare(b));

    sortedClientNames.forEach(clientName => {
        const clientButton = document.createElement('button');
        clientButton.classList.add('client-list-item');
        clientButton.textContent = clientName;
        clientButton.setAttribute('aria-label', `Ver visitas de ${clientName}`);
        clientButton.onclick = () => {
            selectedClientName = clientName;
            currentView = 'clientVisits';
            renderCurrentView();
        };
        dataDisplayContainer.appendChild(clientButton);
    });
}

function renderSingleClientVisitsDisplay(clientName: string): void {
    if (!dataDisplayContainer) return;
    dataDisplayContainer.innerHTML = ''; // Clear previous content

    const backButton = document.createElement('button');
    backButton.classList.add('back-button');
    backButton.textContent = '← Voltar para Lista de Clientes';
    backButton.setAttribute('aria-label', 'Voltar para a lista de clientes');
    backButton.onclick = () => {
        selectedClientName = null;
        currentView = 'clientsList';
        renderCurrentView();
    };
    dataDisplayContainer.appendChild(backButton);

    const heading = document.createElement('h3');
    heading.classList.add('client-visits-heading');
    heading.textContent = `Visitas de: ${clientName}`;
    dataDisplayContainer.appendChild(heading);

    const visits = clientsData.get(clientName);
    if (!visits || visits.length === 0) {
        const noVisitsMsg = document.createElement('p');
        noVisitsMsg.textContent = 'Nenhuma visita registrada para este cliente.';
        noVisitsMsg.classList.add('no-data-message');
        dataDisplayContainer.appendChild(noVisitsMsg);
        return;
    }

    visits.forEach(visitEntry => {
        const visitElement = document.createElement('div');
        visitElement.classList.add('visit-entry');
        visitElement.setAttribute('role', 'listitem');

        const visitData = visitEntry.originalVisitData;
        // Ensure date is parsed correctly considering it's YYYY-MM-DD (local date, not UTC from picker)
        const visitDateObj = new Date(visitData.visitDate + 'T00:00:00'); // Treat as local date

        visitElement.innerHTML = `
            <p><strong>Registrado em (Timestamp):</strong> ${new Date(visitEntry.blockTimestamp).toLocaleString('pt-BR')}</p>
            <p><strong>Bloco Referência:</strong> #${visitEntry.blockIndex}</p>
            <div class="visit-data-details">
                <p><strong>Data da Visita:</strong> ${visitDateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p> <!-- UTC to avoid timezone shifts from picker value -->
                <p><strong>Técnico:</strong> ${visitData.technicianName}</p>
                <p><strong>Descrição:</strong> ${visitData.description.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        dataDisplayContainer.appendChild(visitElement);
    });
}

function renderCurrentView(): void {
    if (!dataDisplayContainer) return;
    dataDisplayContainer.innerHTML = ''; // Clear display

    if (currentView === 'clientsList') {
        renderClientsListDisplay();
    } else if (currentView === 'clientVisits' && selectedClientName) {
        renderSingleClientVisitsDisplay(selectedClientName);
    }
     // Scroll to top of data display container
    dataDisplayContainer.scrollTop = 0;
}

visitForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const visitData: VisitData = {
        clientName: clientNameInput.value.trim(),
        visitDate: visitDateInput.value, // YYYY-MM-DD from date input
        technicianName: technicianNameInput.value.trim(),
        description: descriptionInput.value.trim(),
    };

    if (!visitData.clientName || !visitData.visitDate || !visitData.technicianName) {
        alert("Por favor, preencha todos os campos obrigatórios: Nome do Cliente, Data da Visita e Nome do Técnico.");
        return;
    }

    const newBlock = blockchain.addBlock(visitData);
    updateClientsDataMap(visitData, newBlock.timestamp, newBlock.index);
    
    renderCurrentView();
    visitForm.reset();
    clientNameInput.focus();
});

function initializeApplication(): void {
    // Populate clientsData from any existing blocks in the blockchain (e.g. if loaded from storage later)
    blockchain.chain.forEach(block => {
        if (typeof block.data !== 'string') { // Process only actual visit data blocks
            updateClientsDataMap(block.data, block.timestamp, block.index);
        }
    });
    renderCurrentView();
    if (clientNameInput) {
       clientNameInput.focus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (dataDisplayContainer && visitForm && clientNameInput && visitDateInput && technicianNameInput && descriptionInput) {
        initializeApplication();
    } else {
        console.error("Um ou mais elementos DOM necessários não foram encontrados para inicializar a aplicação.");
    }
});

// Ensure process is defined for environments that might expect it
if (typeof process === 'undefined') {
  (window as any).process = { env: {} };
}
