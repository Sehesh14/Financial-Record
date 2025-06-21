document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const reportMonthYearEl = document.getElementById('report-month-year');
    const exportPdfButton = document.getElementById('export-pdf');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const clearMonthBtn = document.getElementById('clear-month');
    const categorySelect = document.getElementById('category');
    const expenseSourceGroup = document.getElementById('expense-source-group');

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

    const calculatePreviousCategoryBalance = (monthDate, category) => {
        const allData = getAllData();
        const sortedMonthKeys = Object.keys(allData).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            if (yA !== yB) return yA - yB;
            return mA - mB;
        });

        let previousCategoryBalance = 0;
        const currentMonthKey = getMonthKey(monthDate);

        for (const key of sortedMonthKeys) {
            if (key >= currentMonthKey) break;
            const transactions = allData[key];
            const income = transactions.filter(t => t.category === category).reduce((sum, t) => sum + t.amount, 0);
            
            let expenses = 0;
            if (category === 'Tithes') {
                expenses = transactions.filter(t => t.category === 'Expenses' && t.source === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
            } else if (category === 'Offering') {
                expenses = transactions.filter(t => t.category === 'Expenses' && (t.source === 'Offering' || !t.source)).reduce((sum, t) => sum + t.amount, 0);
            }

            previousCategoryBalance += income - expenses;
        }
        return previousCategoryBalance;
    };

    const calculatePreviousBalance = (monthDate) => {
        const prevTithes = calculatePreviousCategoryBalance(monthDate, 'Tithes');
        const prevOffering = calculatePreviousCategoryBalance(monthDate, 'Offering');
        return prevTithes + prevOffering;
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
                const categoryDisplay = tx.category === 'Expenses' 
                    ? `<div><span class="category-badge ${tx.category.toLowerCase()}">${tx.category}</span><br><small class="deduction-source">From ${tx.source}</small></div>`
                    : `<span class="category-badge ${tx.category.toLowerCase()}">${tx.category}</span>`;
                
                row.innerHTML = `
                    <td>${formatDate(tx.date)}</td>
                    <td>${categoryDisplay}</td>
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
        
        const previousTithesBalance = calculatePreviousCategoryBalance(currentMonth, 'Tithes');
        const previousOfferingBalance = calculatePreviousCategoryBalance(currentMonth, 'Offering');
        const previousBalance = previousTithesBalance + previousOfferingBalance;

        const tithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const offering = transactions.filter(t => t.category === 'Offering').reduce((sum, t) => sum + t.amount, 0);

        const expensesFromTithes = transactions.filter(t => t.category === 'Expenses' && t.source === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const expensesFromOffering = transactions.filter(t => t.category === 'Expenses' && t.source === 'Offering').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expensesFromTithes + expensesFromOffering;

        const tithesBalance = previousTithesBalance + tithes - expensesFromTithes;
        const offeringBalance = previousOfferingBalance + offering - expensesFromOffering;
        const currentMonthBalance = tithesBalance + offeringBalance;

        summaryPreviousBalanceEl.textContent = formatCurrency(previousBalance);
        summaryTithesEl.textContent = formatCurrency(tithesBalance);
        balanceTithesEl.textContent = `This month: ${formatCurrency(tithes)}`;
        summaryOfferingEl.textContent = formatCurrency(offeringBalance);
        balanceOfferingEl.textContent = `This month: ${formatCurrency(offering)}`;
        summaryExpensesEl.textContent = formatCurrency(totalExpenses);
        summaryBalanceEl.textContent = formatCurrency(currentMonthBalance);
        
        reportMonthYearEl.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    categorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'Expenses') {
            expenseSourceGroup.style.display = 'block';
        } else {
            expenseSourceGroup.style.display = 'none';
        }
    });

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = e.target.category.value;
        const amount = parseFloat(e.target.amount.value);
        const remarks = e.target.remarks.value;

        const newTransaction = {
            id: Date.now(),
            date: new Date().toISOString(),
            category,
            amount,
            remarks
        };

        if (category === 'Expenses') {
            const source = document.getElementById('expense-source').value;
            newTransaction.source = source;
        }

        if (amount > 0) {
            const transactions = getTransactionsForMonth(currentMonth);
            transactions.push(newTransaction);
            saveTransactionsForMonth(currentMonth, transactions);
            render();
            transactionForm.reset();
            expenseSourceGroup.style.display = 'none';
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

        const previousTithesBalance = calculatePreviousCategoryBalance(currentMonth, 'Tithes');
        const previousOfferingBalance = calculatePreviousCategoryBalance(currentMonth, 'Offering');
        const previousTotalBalance = previousTithesBalance + previousOfferingBalance;

        const monthlyTithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const monthlyOffering = transactions.filter(t => t.category === 'Offering').reduce((sum, t) => sum + t.amount, 0);

        const expensesFromTithes = transactions.filter(t => t.category === 'Expenses' && t.source === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const expensesFromOffering = transactions.filter(t => t.category === 'Expenses' && t.source === 'Offering').reduce((sum, t) => sum + t.amount, 0);
        const totalMonthlyExpenses = expensesFromTithes + expensesFromOffering;

        const finalTithesBalance = previousTithesBalance + monthlyTithes - expensesFromTithes;
        const finalOfferingBalance = previousOfferingBalance + monthlyOffering - expensesFromOffering;
        const finalTotalBalance = finalTithesBalance + finalOfferingBalance;

        const summaryData = [
            ['Previous Balance', formatCurrencyForPdf(previousTotalBalance)],
            ['Tithes Balance', formatCurrencyForPdf(finalTithesBalance)],
            ['Offering Balance', formatCurrencyForPdf(finalOfferingBalance)],
            ['Total Expenses (This Month)', formatCurrencyForPdf(totalMonthlyExpenses)],
            ['Total Balance', formatCurrencyForPdf(finalTotalBalance)]
        ];

        doc.autoTable({ startY: 45, head: [['Summary', 'Amount']], body: summaryData, theme: 'striped', headStyles: { fillColor: [106, 90, 249] } });
        
        const tableData = transactions.map(tx => {
            const allocation = tx.category === 'Expenses' ? `From ${tx.source}` : '-';
            return [formatDate(tx.date), tx.category, allocation, tx.remarks || '-', formatCurrencyForPdf(tx.amount)];
        });
        doc.autoTable({ startY: doc.autoTable.previous.finalY + 10, head: [['Date', 'Category', 'Allocation', 'Remarks', 'Amount']], body: tableData, theme: 'grid', headStyles: { fillColor: [106, 90, 249] } });

        doc.save(`Financial-Report-${monthYear.replace(' ', '-')}.pdf`);
    });

    render();
}); 