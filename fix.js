const fs = require('fs');
let code = fs.readFileSync('public/dashboard.js', 'utf8');

// Replace static string literals with dynamic currency values
code = code.replace(/Amount \(₦\)/g, "Amount (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')");
code = code.replace(/Price \(₦\)/g, "Price (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')");
code = code.replace(/Salary \(₦\)/g, "Salary (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')");
code = code.replace(/Collected \(₦\)/g, "Collected (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')");
code = code.replace(/Calculate \(₦\)/g, "Calculate (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')");

// Fix the corrupted strings from the previous regex
code = code.replace(/'Invoice INV-2024-0453 for  has been paid by Best Foods Ltd.'/, "'Invoice INV-2024-0453 for ' + formatCurrency(450000) + ' has been paid by Best Foods Ltd.'");
code = code.replace(/'Payment of  to Sterling Bank was declined. Please retry.'/, "'Payment of ' + formatCurrency(128000) + ' to Sterling Bank was declined. Please retry.'");

// Double check if any `Template string` with formatCurrency was incorrectly placed
code = code.replace(/`Invoice INV-2024-0453 for \$\{formatCurrency\(450000\)\} has been paid by Best Foods Ltd.`,/g, "");
code = code.replace(/`Payment of \$\{formatCurrency\(128000\)\} to Sterling Bank was declined. Please retry.`,/g, "");

fs.writeFileSync('public/dashboard.js', code);
