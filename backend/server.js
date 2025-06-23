// index.js (Your Backend Server)

const express = require('express');
const mysql = require('mysql'); // Using 'mysql' for callback-based queries
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default; // Yahoo Finance API client

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", // Or your actual MySQL root password
    database: "stock_trading" // !! IMPORTANT: Make sure this is your actual database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        // It's good practice to exit the process if the DB connection fails at startup
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// --- API Routes ---

// Fetch current stock price for a given symbol using Yahoo Finance
app.get('/stock-price/:symbol', async (req, res) => {
    const originalSymbol = req.params.symbol;
    console.log(`Attempting to fetch price for symbol: ${originalSymbol}`);

    let currentPrice = null;
    let dataSource = 'None';
    let errorMessage = '';

    // --- Try Yahoo Finance First ---
    try {
        // Convert .NSE to .NS for Yahoo Finance compatibility
        // If your symbols are already .NS, this replace won't do anything.
        const yahooSymbol = originalSymbol.replace(/\.NSE$/, '.NS');
        console.log(`Trying Yahoo Finance with symbol: ${yahooSymbol}`);

        const quote = await yahooFinance.quote(yahooSymbol);

        // Check if valid price data is returned
        if (quote && quote.regularMarketPrice && typeof quote.regularMarketPrice === 'number') {
            currentPrice = quote.regularMarketPrice;
            dataSource = 'Yahoo Finance';
            console.log(`Successfully fetched price from Yahoo Finance for ${yahooSymbol}: ${currentPrice}`);
        } else {
            errorMessage += `Yahoo Finance: No valid price data found for symbol: ${yahooSymbol}. Quote data might be incomplete.\n`;
            console.warn(`Yahoo Finance Warning: No valid price for ${yahooSymbol}. Quote data:`, quote);
        }
    } catch (yahooError) {
        errorMessage += `Error fetching from Yahoo Finance for ${originalSymbol}: ${yahooError.message}\n`;
        console.error(`Yahoo Finance Error for ${originalSymbol}:`, yahooError.message);
    }

    // --- Send Response ---
    if (currentPrice !== null) {
        res.json({ symbol: originalSymbol, currentPrice: currentPrice, dataSource: dataSource });
    } else {
        // If no price was found from any source, send a 500 error
        res.status(500).json({ error: `Failed to fetch price for ${originalSymbol}. Details:\n${errorMessage.trim()}` });
    }
});


// Fetch all OPEN trades for a specific expiry date
// This endpoint continues to filter by `status = 'open'`
app.get('/trades/:expiry', (req, res) => {
    const { expiry } = req.params;
    const sql = `SELECT ID, Stock_name, Lot, Strike_Price, Qty, Type, Premium, Total_Premium, Expiry, status, closing_price, total_closing_value
                    FROM input
                    WHERE Expiry = ? AND status = ?`;

    db.query(sql, [expiry, 'open'], (err, results) => {
        if (err) {
            console.error('Error fetching open trades:', err);
            return res.status(500).json({ error: 'Failed to fetch open trades' });
        }
        res.json(results);
    });
});

// NEW ENDPOINT: Fetch ALL trades (open or closed) for a specific expiry date
// This endpoint does NOT filter by `status`
app.get('/trades/all/:expiry', (req, res) => {
    const { expiry } = req.params;
    // !! IMPORTANT: Include profit_or_loss and profit_percentage in the SELECT statement
    const sql = `SELECT ID, Stock_name, Lot, Strike_Price, Qty, Type, Premium, Total_Premium, Expiry, status, closing_price, total_closing_value, profit_or_loss, profit_percentage
                    FROM input
                    WHERE Expiry = ?`;

    db.query(sql, [expiry], (err, results) => {
        if (err) {
            console.error('Error fetching all trades:', err);
            return res.status(500).json({ error: 'Failed to fetch all trades' });
        }
        res.json(results);
    });
});


// Fetch single trade by ID (used for editing or closing details display)
// Ensure profit_or_loss and profit_percentage are fetched here too, especially for closed trades
app.get("/trade/:id", (req, res) => {
    const { id } = req.params;
    // !! IMPORTANT: Include Type and Buy_Sell for profit/loss calculation in the close route
    // Also include profit_or_loss and profit_percentage for displaying on CloseTrade page if already closed
    const sql = `SELECT ID, Stock_name, Lot, Strike_Price, Qty, Type, Buy_Sell, Premium, Total_Premium, Expiry, status, closing_price, total_closing_value, profit_or_loss, profit_percentage FROM input WHERE ID = ?`;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Fetch single trade Error:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "Trade not found." });
        }
        res.json(result[0]);
    });
});


// Add Trade Route (POST request to /add)
// Sets 'status' to 'open' by default
app.post('/add', (req, res) => {
    // Added Buy_Sell to req.body destructuring as it's part of your schema now
    const { Stock_name, Lot, Strike_Price, Qty, Type, Buy_Sell, Premium, Expiry } = req.body;


    // Validate and parse numeric fields
    const numericLot = parseFloat(Lot);
    const numericStrikePrice = parseFloat(Strike_Price);
    const numericQty = parseFloat(Qty);
    const numericPremium = parseFloat(Premium);

    // Make sure Buy_Sell is provided and valid (e.g., 'BUY' or 'SELL')
    if (!Stock_name || isNaN(numericLot) || isNaN(numericStrikePrice) || isNaN(numericQty) || isNaN(numericPremium) || !Type || !Buy_Sell || !Expiry) {
        return res.status(400).json({ message: 'All required fields are required and numeric fields must be valid numbers.' });
    }
    if (!['BUY', 'SELL'].includes(Buy_Sell.toUpperCase())) {
        return res.status(400).json({ message: 'Buy/Sell must be either "BUY" or "SELL".' });
    }

    const Total_Premium = numericLot * numericQty * numericPremium;

    // !! IMPORTANT: Add Buy_Sell to the INSERT statement and values
    const sql = 'INSERT INTO input (Stock_name, Lot, Strike_Price, Qty, Type, Buy_Sell, Premium, Total_Premium, Expiry, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [Stock_name, numericLot, numericStrikePrice, numericQty, Type, Buy_Sell.toUpperCase(), numericPremium, Total_Premium, Expiry, 'open']; // Explicitly set status to 'open'

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding trade:', err.sqlMessage || err);
            return res.status(500).json({ message: 'Failed to add trade: ' + (err.sqlMessage || err.message) });
        }
        res.status(201).json({ message: 'Trade added successfully!', id: result.insertId });
    });
});

// Edit Trade Route
// This route is for general trade details editing, not for changing status or closing.
app.put('/edit/:id', (req, res) => {
    const { id } = req.params;
    // Added Buy_Sell to req.body destructuring
    const { Stock_name, Lot, Strike_Price, Qty, Type, Buy_Sell, Premium, Expiry } = req.body;

    // Validate and parse numeric fields
    const numericLot = parseFloat(Lot);
    const numericStrikePrice = parseFloat(Strike_Price);
    const numericQty = parseFloat(Qty);
    const numericPremium = parseFloat(Premium);

    // Added Buy_Sell validation
    if (!Stock_name || isNaN(numericLot) || isNaN(numericStrikePrice) || isNaN(numericQty) || isNaN(numericPremium) || !Type || !Buy_Sell || !Expiry) {
        return res.status(400).json({ message: 'All required fields are required and numeric fields must be valid numbers.' });
    }
    if (!['BUY', 'SELL'].includes(Buy_Sell.toUpperCase())) {
        return res.status(400).json({ message: 'Buy/Sell must be either "BUY" or "SELL".' });
    }

    const Total_Premium = numericLot * numericQty * numericPremium;

    // !! IMPORTANT: Add Buy_Sell to the UPDATE statement and values
    const sql = 'UPDATE input SET Stock_name = ?, Lot = ?, Strike_Price = ?, Qty = ?, Type = ?, Buy_Sell = ?, Premium = ?, Total_Premium = ?, Expiry = ? WHERE ID = ?';
    const values = [Stock_name, numericLot, numericStrikePrice, numericQty, Type, Buy_Sell.toUpperCase(), numericPremium, Total_Premium, Expiry, id];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating trade:', err.sqlMessage || err);
            return res.status(500).json({ message: 'Failed to update trade: ' + (err.sqlMessage || err.message) });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Trade not found.' });
        }
        res.json({ message: 'Trade updated successfully!' });
    });
});


// PUT /trades/close/:id - Close a trade (sets status to 'closed')
app.put('/trades/close/:id', (req, res) => {
    const tradeId = req.params.id;
    const { closingPrice } = req.body; // Expect closingPrice in the request body

    // Changed condition to allow 0 for options that expire worthless.
    // However, if closingPrice is meant to be the *underlying* stock price,
    // then it should usually be positive. If it's the *option's premium*, 0 is valid.
    // Based on the frontend CloseTradePage.js, it's the "Option's Closing Premium", so 0 is fine.
    if (typeof closingPrice !== 'number' || isNaN(closingPrice) || closingPrice < 0) { // Changed from <= 0 to < 0
        return res.status(400).json({ message: 'Invalid closing premium provided. Must be a non-negative number.' });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ message: 'Failed to close trade due to transaction error.' });
        }

        // Fetch Lot, Qty, status, Total_Premium, Type, and Buy_Sell for calculation
        // Also fetch Strike_Price as it's crucial for intrinsic value calculation
        const fetchSql = `SELECT Lot, Qty, status, Total_Premium, Type, Buy_Sell, Strike_Price FROM input WHERE ID = ?`;
        db.query(fetchSql, [tradeId], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Error fetching trade for close:', err);
                    res.status(500).json({ message: 'Failed to fetch trade details.' });
                });
            }

            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ message: 'Trade not found.' });
                });
            }

            const trade = results[0];

            if (trade.status === 'closed') {
                return db.rollback(() => {
                    res.status(400).json({ message: 'Trade is already closed.' });
                });
            }

            const lotSize = parseFloat(trade.Lot);
            const quantity = parseFloat(trade.Qty);
            const initialTotalPremium = parseFloat(trade.Total_Premium);
            const tradeType = trade.Type ? String(trade.Type).toLowerCase() : '';
            const tradeBuySell = trade.Buy_Sell ? String(trade.Buy_Sell).toLowerCase() : '';
            const strikePrice = parseFloat(trade.Strike_Price);


            if (isNaN(lotSize) || isNaN(quantity) || lotSize <= 0 || quantity <= 0) {
                return db.rollback(() => {
                    res.status(400).json({ message: 'Invalid Lot or Qty for trade. Cannot calculate total closing value.' });
                });
            }
            if (isNaN(initialTotalPremium)) {
                return db.rollback(() => {
                    res.status(400).json({ message: 'Invalid initial Total_Premium for trade. Cannot calculate profit/loss.' });
                });
            }
            if (isNaN(strikePrice)) {
                return db.rollback(() => {
                    res.status(400).json({ message: 'Invalid Strike_Price for trade. Cannot calculate profit/loss.' });
                });
            }


            const totalShares = lotSize * quantity;
            let profitOrLoss = 0;

            // --- IMPORTANT: Revised Profit/Loss Calculation Logic ---
            // This is the correct way to calculate P&L for options based on type and buy/sell
            // The `closingPrice` here is the *Option's Premium at Close*
            const closingOptionTotalPremium = closingPrice * totalShares; // Total premium received/paid to close the option

            if (tradeBuySell === "buy") { // If you initially BOUGHT the option (e.g., Long Call, Long Put)
                // You paid initialTotalPremium and received closingOptionTotalPremium when selling to close
                // P&L = (Money Received at Close) - (Money Paid at Open)
                profitOrLoss = closingOptionTotalPremium - initialTotalPremium;
            } else if (tradeBuySell === "sell") { // If you initially SOLD the option (e.g., Short Call, Short Put)
                // You received initialTotalPremium and paid closingOptionTotalPremium to buy back to close
                // P&L = (Money Received at Open) - (Money Paid at Close)
                profitOrLoss = initialTotalPremium - closingOptionTotalPremium;
            } else {
                // This case should ideally not be hit if Buy_Sell is properly validated on insert
                console.warn(`Unknown Buy_Sell type for trade ID ${tradeId}. Defaulting to 'BUY' side P&L calculation.`);
                profitOrLoss = closingOptionTotalPremium - initialTotalPremium; // A generic calculation if type is unknown
            }

            let profitPercentage = 0;
            // Calculate profit percentage relative to the absolute initial premium
            if (initialTotalPremium !== 0) {
                profitPercentage = (profitOrLoss / Math.abs(initialTotalPremium)) * 100;
            } else {
                // If initial premium was 0 (e.g., certain spread strategies where premium nets to zero),
                // or if it was extremely small.
                // If profitOrLoss is also 0, percentage is 0. If profitOrLoss is non-zero, % could be infinite.
                profitPercentage = (profitOrLoss === 0) ? 0 : (profitOrLoss > 0 ? Infinity : -Infinity);
            }

            // Round values to 2 decimal places before saving to DB and sending response
            profitOrLoss = parseFloat(profitOrLoss.toFixed(2));
            const finalTotalClosingValue = parseFloat(closingOptionTotalPremium.toFixed(2)); // This is the total premium value at close
            if (profitPercentage !== Infinity && profitPercentage !== -Infinity) { // Only round if it's a number
                profitPercentage = parseFloat(profitPercentage.toFixed(2));
            }


            // !! IMPORTANT: Update the SQL query to include profit_percentage
            const updateSql = `UPDATE input SET status = ?, closing_price = ?, total_closing_value = ?, profit_or_loss = ?, profit_percentage = ? WHERE ID = ?`;
            const updateValues = ['closed', closingPrice, finalTotalClosingValue, profitOrLoss, profitPercentage, tradeId];

            db.query(updateSql, updateValues, (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating trade status/closing details:', err);
                        res.status(500).json({ message: 'Failed to update trade details.' });
                    });
                }

                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: 'Trade not found for update.' });
                    });
                }

                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ message: 'Failed to commit trade closure.' });
                        });
                    }
                    // Send back all relevant calculated values to frontend
                    res.status(200).json({ message: 'Trade closed successfully!', totalClosingValue: finalTotalClosingValue, profitOrLoss, profitPercentage });
                });
            });
        });
    });
});

// Delete Trade Route
app.delete('/trades/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM input WHERE ID = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting trade:', err.sqlMessage || err);
            return res.status(500).json({ message: 'Failed to delete trade: ' + (err.sqlMessage || err.message) });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Trade not found.' });
        }
        res.json({ message: 'Trade deleted successfully!' });
    });
});


const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});