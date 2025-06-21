document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const reportMonthYearEl = document.getElementById('report-month-year');
    const exportPdfButton = document.getElementById('export-pdf');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const clearMonthBtn = document.getElementById('clear-month');

    // Summary elements
    const summaryPreviousBalanceEl = document.getElementById('summary-previous-balance');
    const summaryTithesEl = document.getElementById('summary-tithes');
    const balanceTithesEl = document.getElementById('balance-tithes');
    const summaryOfferingEl = document.getElementById('summary-offering');
    const balanceOfferingEl = document.getElementById('balance-offering');
    const summaryExpensesEl = document.getElementById('summary-expenses');
    const summaryBalanceEl = document.getElementById('summary-balance');

    const CURRENCY = '₱';
    let currentMonth = new Date();
    currentMonth.setDate(1);

    const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

    const getAllData = () => {
        const data = localStorage.getItem('financialData');
        return data ? JSON.parse(data) : {};
    };

    const saveData = (allData) => {
        localStorage.setItem('financialData', JSON.stringify(allData));
    };

    const getTransactionsForMonth = (date) => {
        const allData = getAllData();
        const monthKey = getMonthKey(date);
        return allData[monthKey] || [];
    };

    const saveTransactionsForMonth = (date, transactions) => {
        const allData = getAllData();
        const monthKey = getMonthKey(date);
        allData[monthKey] = transactions;
        saveData(allData);
    };

    const calculatePreviousBalance = (monthDate) => {
        const allData = getAllData();
        const sortedMonthKeys = Object.keys(allData).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            if (yA !== yB) return yA - yB;
            return mA - mB;
        });

        let previousBalance = 0;
        const currentMonthKey = getMonthKey(monthDate);

        for (const key of sortedMonthKeys) {
            if (key >= currentMonthKey) break;
            const transactions = allData[key];
            const tithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
            const offering = transactions.filter(t => t.category === 'Offering').reduce((sum, t) => sum + t.amount, 0);
            const expenses = transactions.filter(t => t.category === 'Expenses').reduce((sum, t) => sum + t.amount, 0);
            previousBalance += tithes + offering - expenses;
        }
        return previousBalance;
    };

    const formatCurrency = (amount) => `${CURRENCY}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const render = () => {
        const transactions = getTransactionsForMonth(currentMonth);
        transactionList.innerHTML = '';
        if (transactions.length === 0) {
            transactionList.innerHTML = `<tr><td colspan="6" style="text-align: center;">No transactions for this month.</td></tr>`;
        } else {
            transactions.forEach(tx => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(tx.date)}</td>
                    <td><span class="category-badge ${tx.category.toLowerCase()}">${tx.category}</span></td>
                    <td>-</td>
                    <td>${tx.remarks || '-'}</td>
                    <td>${formatCurrency(tx.amount)}</td>
                    <td><button class="btn btn-remove" data-id="${tx.id}">Remove</button></td>
                `;
                transactionList.appendChild(row);
            });
        }
        updateSummary();
    };

    const updateSummary = () => {
        const transactions = getTransactionsForMonth(currentMonth);
        const previousBalance = calculatePreviousBalance(currentMonth);

        const tithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const offering = transactions.filter(t => t.category === 'Offering').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.category === 'Expenses').reduce((sum, t) => sum + t.amount, 0);
        const currentMonthBalance = previousBalance + tithes + offering - expenses;

        summaryPreviousBalanceEl.textContent = formatCurrency(previousBalance);
        summaryTithesEl.textContent = formatCurrency(tithes);
        balanceTithesEl.textContent = `Balance: ${formatCurrency(tithes)}`;
        summaryOfferingEl.textContent = formatCurrency(offering);
        balanceOfferingEl.textContent = `Balance: ${formatCurrency(offering)}`;
        summaryExpensesEl.textContent = formatCurrency(expenses);
        summaryBalanceEl.textContent = formatCurrency(currentMonthBalance);
        
        reportMonthYearEl.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = e.target.category.value;
        const amount = parseFloat(e.target.amount.value);
        const remarks = e.target.remarks.value;

        if (amount > 0) {
            const newTransaction = { id: Date.now(), date: new Date().toISOString(), category, amount, remarks };
            const transactions = getTransactionsForMonth(currentMonth);
            transactions.push(newTransaction);
            saveTransactionsForMonth(currentMonth, transactions);
            render();
            transactionForm.reset();
        } else {
            alert('Please enter a valid amount.');
        }
    });

    transactionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            const transactionId = parseInt(e.target.dataset.id, 10);
            let transactions = getTransactionsForMonth(currentMonth);
            transactions = transactions.filter(tx => tx.id !== transactionId);
            saveTransactionsForMonth(currentMonth, transactions);
            render();
        }
    });
    
    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        render();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        render();
    });

    clearMonthBtn.addEventListener('click', () => {
        const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const transactions = getTransactionsForMonth(currentMonth);

        if (transactions.length === 0) {
            alert(`There are no transactions to clear for ${monthName}.`);
            return;
        }

        if (confirm(`Are you sure you want to clear all transactions for ${monthName}? This action cannot be undone.`)) {
            saveTransactionsForMonth(currentMonth, []);
            render();
        }
    });

    exportPdfButton.addEventListener('click', async () => {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            return alert('PDF generation library not loaded.');
        }
        const { jsPDF } = window.jspdf;
        if (typeof new jsPDF().autoTable !== 'function') {
            return alert('PDF table library not loaded.');
        }
        const doc = new jsPDF();
        
        let logoDataUrl = null;
        try {
            const r = await fetch('logo.png');
            if (r.ok) {
                const blob = await r.blob();
                logoDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.error("Could not load logo for PDF.", e);
        }

        const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 14, 15, 20, 20);

        const textX = logoDataUrl ? 40 : 14;
        doc.setFontSize(18).text(`Monthly Financial Report`, textX, 22);
        doc.setFontSize(11).setTextColor(100).text(monthYear, textX, 29);

        const formatCurrencyForPdf = (amount) => `PHP ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
        
        const transactions = getTransactionsForMonth(currentMonth);
        const previousBalance = calculatePreviousBalance(currentMonth);
        const tithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const offering = transactions.filter(t => t.category === 'Offering').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.category === 'Expenses').reduce((sum, t) => sum + t.amount, 0);
        const totalBalance = previousBalance + tithes + offering - expenses;

        const summaryData = [
            ['Previous Balance', formatCurrencyForPdf(previousBalance)],
            ['Tithes', formatCurrencyForPdf(tithes)],
            ['Offering', formatCurrencyForPdf(offering)],
            ['Expenses', formatCurrencyForPdf(expenses)],
            ['Total Balance', formatCurrencyForPdf(totalBalance)]
        ];

        doc.autoTable({ startY: 45, head: [['Summary', 'Amount']], body: summaryData, theme: 'striped', headStyles: { fillColor: [106, 90, 249] } });
        
        const tableData = transactions.map(tx => [formatDate(tx.date), tx.category, tx.remarks || '-', formatCurrencyForPdf(tx.amount)]);
        doc.autoTable({ startY: doc.autoTable.previous.finalY + 10, head: [['Date', 'Category', 'Remarks', 'Amount']], body: tableData, theme: 'grid', headStyles: { fillColor: [106, 90, 249] } });

        doc.save(`Financial-Report-${monthYear.replace(' ', '-')}.pdf`);
    });

    render();
}); 