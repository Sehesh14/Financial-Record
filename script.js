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
    const summaryMorningOfferingEl = document.getElementById('summary-morning-offering');
    const balanceMorningOfferingEl = document.getElementById('balance-morning-offering');
    const summaryYouthOfferingEl = document.getElementById('summary-youth-offering');
    const balanceYouthOfferingEl = document.getElementById('balance-youth-offering');
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
            } else if (category === 'Morning Offering') {
                expenses = transactions.filter(t => t.category === 'Expenses' && t.source === 'Morning Offering').reduce((sum, t) => sum + t.amount, 0);
            } else if (category === 'Youth Offering') {
                expenses = transactions.filter(t => t.category === 'Expenses' && t.source === 'Youth Offering').reduce((sum, t) => sum + t.amount, 0);
            }
            previousCategoryBalance += income - expenses;
        }
        return previousCategoryBalance;
    };

    const calculatePreviousBalance = (monthDate) => {
        const prevTithes = calculatePreviousCategoryBalance(monthDate, 'Tithes');
        const prevMorning = calculatePreviousCategoryBalance(monthDate, 'Morning Offering');
        const prevYouth = calculatePreviousCategoryBalance(monthDate, 'Youth Offering');
        return prevTithes + prevMorning + prevYouth;
    };

    const formatCurrency = (amount) => `${CURRENCY}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Helper for PHP currency
    const formatCurrencyForPdf = (amount) => `PHP ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

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
        const previousMorningOfferingBalance = calculatePreviousCategoryBalance(currentMonth, 'Morning Offering');
        const previousYouthOfferingBalance = calculatePreviousCategoryBalance(currentMonth, 'Youth Offering');
        const previousBalance = previousTithesBalance + previousMorningOfferingBalance + previousYouthOfferingBalance;

        const tithes = transactions.filter(t => t.category === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const morningOffering = transactions.filter(t => t.category === 'Morning Offering').reduce((sum, t) => sum + t.amount, 0);
        const youthOffering = transactions.filter(t => t.category === 'Youth Offering').reduce((sum, t) => sum + t.amount, 0);

        const expensesFromTithes = transactions.filter(t => t.category === 'Expenses' && t.source === 'Tithes').reduce((sum, t) => sum + t.amount, 0);
        const expensesFromMorningOffering = transactions.filter(t => t.category === 'Expenses' && t.source === 'Morning Offering').reduce((sum, t) => sum + t.amount, 0);
        const expensesFromYouthOffering = transactions.filter(t => t.category === 'Expenses' && t.source === 'Youth Offering').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expensesFromTithes + expensesFromMorningOffering + expensesFromYouthOffering;

        const tithesBalance = previousTithesBalance + tithes - expensesFromTithes;
        const morningOfferingBalance = previousMorningOfferingBalance + morningOffering - expensesFromMorningOffering;
        const youthOfferingBalance = previousYouthOfferingBalance + youthOffering - expensesFromYouthOffering;
        const currentMonthBalance = tithesBalance + morningOfferingBalance + youthOfferingBalance;

        summaryPreviousBalanceEl.textContent = formatCurrency(previousBalance);
        summaryTithesEl.textContent = formatCurrency(tithesBalance);
        balanceTithesEl.textContent = `This month: ${formatCurrency(tithes)}`;
        summaryMorningOfferingEl.textContent = formatCurrency(morningOfferingBalance);
        balanceMorningOfferingEl.textContent = `This month: ${formatCurrency(morningOffering)}`;
        summaryYouthOfferingEl.textContent = formatCurrency(youthOfferingBalance);
        balanceYouthOfferingEl.textContent = `This month: ${formatCurrency(youthOffering)}`;
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
        doc.setFont('times', '');

        // Load left logo
        let logoLeftDataUrl = null;
        try {
            const r = await fetch('Logo.png');
            if (r.ok) {
                const blob = await r.blob();
                logoLeftDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.error("Could not load left logo for PDF.", e);
        }
        // Load right logo
        let logoRightDataUrl = null;
        try {
            const r = await fetch('RCM_New logo.png');
            if (r.ok) {
                const blob = await r.blob();
                logoRightDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.error("Could not load right logo for PDF.", e);
        }

        // Place RCM_New logo.png at the top right and Logo.png close to its lower left
        if (logoRightDataUrl) doc.addImage(logoRightDataUrl, 'PNG', 170, 12, 24, 24);
        if (logoLeftDataUrl) doc.addImage(logoLeftDataUrl, 'PNG', 165, 32, 18, 18);

        // Header text (left-aligned)
        doc.setFont('times', 'bold');
        doc.text('JESUS CHRIST FOR YOU AND ME COMMUNITY CHURCH', 15, 20);
        doc.text('ROOTED FOR CHRIST MINISTRY', 15, 26);
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text('#28 Phase 3 Area D, Payatas B, Quezon City, Metro Manila, 1119', 15, 32);
        doc.text('(02) 8253 6958', 15, 37);
        doc.text('Sec. Reg No. C11201604692 (Under PFCCP)', 15, 42);
        doc.text('Tin No. 009-243-998', 15, 47);
        // Horizontal line
        doc.setLineWidth(2);
        doc.line(15, 54, 195, 54);
        // 'Office of the Church Administrator' only below the line
        doc.setFontSize(12);
        doc.text('Office of the Church Administrator', 15, 60);

        // Add extra vertical space before the title
        let titleY = 70;
        // Title
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text('MONTHLY FINANCIAL REPORT', 105, titleY, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(55, titleY + 2, 155, titleY + 2); // underline
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.text(`Month of ${monthYear}`, 105, titleY + 15, { align: 'center' });

        // Add extra space before the first table
        let summaryY = titleY + 30;
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('Last Month Summary Report', 15, summaryY);
        doc.setFont('times', 'normal');
        const prevMonth = new Date(currentMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevTithes = calculatePreviousCategoryBalance(prevMonth, 'Tithes');
        const prevMorning = calculatePreviousCategoryBalance(prevMonth, 'Morning Offering');
        const prevYouth = calculatePreviousCategoryBalance(prevMonth, 'Youth Offering');
        doc.autoTable({
            startY: summaryY + 4,
            head: [["Tithes", "Morning Offering", "Youth Offering"]],
            body: [[
                formatCurrencyForPdf(prevTithes),
                formatCurrencyForPdf(prevMorning),
                formatCurrencyForPdf(prevYouth)
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0,0,0] },
            bodyStyles: { halign: 'center', lineWidth: 0.5, lineColor: [0,0,0] },
            styles: { fontSize: 11, cellPadding: 3, lineWidth: 0.5, lineColor: [0,0,0] }
        });

        // This Month Detailed Report
        let y = doc.lastAutoTable.finalY + 10;
        doc.setFont('times', 'bold');
        doc.text('This Month Detailed Report', 12, y);
        doc.setFont('times', 'normal');
        const transactions = getTransactionsForMonth(currentMonth);
        const expenseRows = transactions.filter(tx => tx.category === 'Expenses').map(tx => [
            formatDate(tx.date),
            tx.source,
            tx.remarks || '-',
            formatCurrencyForPdf(tx.amount)
        ]);
        doc.autoTable({
            startY: y + 4,
            head: [["Date", "Category", "Remarks", "Amount"]],
            body: expenseRows.length ? expenseRows : [["-", "-", "-", "-"]],
            theme: 'grid',
            headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0,0,0] },
            bodyStyles: { halign: 'center', lineWidth: 0.5, lineColor: [0,0,0] },
            styles: { fontSize: 11, cellPadding: 3, lineWidth: 0.5, lineColor: [0,0,0] }
        });

        // Signature lines
        let signY = 270;
        doc.setFontSize(11);
        doc.text("________________________", 20, signY);
        doc.text("________________________", 120, signY);
        doc.text("Church Administration", 25, signY + 7);
        doc.text("Church Accountant", 125, signY + 7);

        doc.save(`Financial-Report-${monthYear.replace(' ', '-')}.pdf`);
    });

    render();
}); 