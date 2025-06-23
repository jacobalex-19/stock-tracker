// src/ViewTrades.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './ViewTrades.css'; // Import the dedicated CSS for ViewTrades

// --- Helper Functions (Extracted for conciseness and better readability) ---

// Helper to get the next Thursday expiry date
const getNextThursdayExpiry = () => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    let lastDayOfMonth = new Date(year, month + 1, 0);
    let lastThursday = new Date(lastDayOfMonth);
    while (lastThursday.getDay() !== 4) {
        lastThursday.setDate(lastThursday.getDate() - 1);
    }

    if (today > lastThursday && today.getDate() > 20) {
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }

        lastDayOfMonth = new Date(year, month + 1, 0);
        lastThursday = new Date(lastDayOfMonth);
        while (lastThursday.getDay() !== 4) {
            lastThursday.setDate(lastThursday.getDate() - 1);
        }
    }

    const formattedYear = lastThursday.getFullYear();
    const formattedMonth = String(lastThursday.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(lastThursday.getDate()).padStart(2, '0');
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
};

// Helper for calculating Price Diff (%)
const calculatePriceDifference = (currentPrice, strikePrice) => {
    if (typeof currentPrice !== 'number' || currentPrice === null || currentPrice === undefined ||
        typeof strikePrice !== 'number' || isNaN(strikePrice) || strikePrice === null || strikePrice === undefined || strikePrice === 0) {
        return { diff: null, percentage: null, colorClass: "text-muted italic-text" };
    }

    const diff = currentPrice - strikePrice;
    const percentage = (diff / strikePrice) * 100;

    let colorClass = "";
    if (percentage < 0) {
        colorClass = "text-danger bold-text";
    } else if (percentage > 0 && percentage < 5) {
        colorClass = "text-warning bold-text";
    } else if (percentage >= 5) {
        colorClass = "text-success bold-text";
    } else {
        colorClass = "text-muted";
    }

    return {
        diff: typeof diff === 'number' && !isNaN(diff) ? diff.toFixed(2) : null,
        percentage: typeof percentage === 'number' && !isNaN(percentage) ? percentage.toFixed(2) : null,
        colorClass: colorClass
    };
};

// Helper for determining profit/loss status text and class
const getProfitWarning = (trade, currentPrice = null) => {
    if (trade.status === 'closed') {
        const profitOrLoss = typeof trade.profit_or_loss === 'number' ? parseFloat(trade.profit_or_loss) : NaN;
        if (isNaN(profitOrLoss)) {
            return <span className="text-muted italic-text">N/A</span>;
        }
        if (profitOrLoss > 0) {
            return <span className="text-success bold-text">Closed (Profit)</span>;
        } else if (profitOrLoss < 0) {
            return <span className="text-danger bold-text">Closed (Loss)</span>;
        } else {
            return <span className="text-muted">Closed (No Change)</span>;
        }
    }

    const tradeType = String(trade.Type || '').toLowerCase();
    const tradeBuySell = String(trade.Buy_Sell || 'buy').toLowerCase();
    const strikePrice = parseFloat(trade.Strike_Price);

    if (typeof currentPrice !== 'number' || isNaN(currentPrice) || isNaN(strikePrice)) {
        return <span className="text-muted italic-text">Loading/N/A</span>;
    }

    let statusText = "Neutral";
    let statusClass = "text-muted";

    if (tradeType === "call") {
        if (tradeBuySell === "buy") { // Long Call
            if (currentPrice > strikePrice) { // In The Money (ITM)
                statusText = "In Profit";
                statusClass = "text-success bold-text";
            } else { // At The Money (ATM) or Out of The Money (OTM)
                statusText = "Out of Money";
                statusClass = "text-danger bold-text";
            }
        } else if (tradeBuySell === "sell") { // Short Call
            if (currentPrice < strikePrice) { // OTM for buyer, so ITM for seller (profit)
                statusText = "In Profit";
                statusClass = "text-success bold-text";
            } else { // ITM for buyer, so OTM for seller (loss)
                statusText = "Losing Money";
                statusClass = "text-danger bold-text";
            }
        }
    } else if (tradeType === "put") {
        if (tradeBuySell === "buy") { // Long Put
            if (currentPrice < strikePrice) { // ITM
                statusText = "In Profit";
                statusClass = "text-success bold-text";
            } else { // ATM or OTM
                statusText = "Out of Money";
                statusClass = "text-danger bold-text";
            }
        } else if (tradeBuySell === "sell") { // Short Put
            if (currentPrice > strikePrice) { // OTM for buyer, so ITM for seller (profit)
                statusText = "In Profit";
                statusClass = "text-success bold-text";
            } else { // ITM for buyer, so OTM for seller (loss)
                statusText = "Losing Money";
                statusClass = "text-danger bold-text";
            }
        }
    } else {
        statusText = "Invalid Type";
        statusClass = "text-danger";
    }

    return <span className={statusClass}>{statusText}</span>;
};

// Helper for calculating Current Value (P&L) - UNREALIZED for open trades
const calculateCurrentValue = (trade, currentPrice) => {
    if (trade.status === 'closed') {
        return typeof trade.profit_or_loss === 'number' ? `₹${trade.profit_or_loss.toFixed(2)}` : "N/A";
    }

    const tradeType = String(trade.Type || '').toLowerCase();
    const tradeBuySell = String(trade.Buy_Sell || 'buy').toLowerCase();
    const strikePrice = parseFloat(trade.Strike_Price);
    const lotSize = parseFloat(trade.Lot);
    const quantity = parseFloat(trade.Qty);
    const premiumPerShare = parseFloat(trade.Premium);

    if (typeof currentPrice !== 'number' || isNaN(currentPrice) || currentPrice === null || currentPrice === undefined ||
        isNaN(strikePrice) || isNaN(lotSize) || isNaN(quantity) || isNaN(premiumPerShare)) {
        return "N/A";
    }

    let unrealizedPnL = 0;
    const totalShares = lotSize * quantity;
    const totalPremiumPaid = premiumPerShare * totalShares;

    if (tradeType === "call") {
        const intrinsicValuePerShare = Math.max(0, currentPrice - strikePrice);
        if (tradeBuySell === "buy") {
            unrealizedPnL = (intrinsicValuePerShare * totalShares) - totalPremiumPaid;
        } else if (tradeBuySell === "sell") {
            unrealizedPnL = totalPremiumPaid - (intrinsicValuePerShare * totalShares);
        }
    } else if (tradeType === "put") {
        const intrinsicValuePerShare = Math.max(0, strikePrice - currentPrice);
        if (tradeBuySell === "buy") {
            unrealizedPnL = (intrinsicValuePerShare * totalShares) - totalPremiumPaid;
        } else if (tradeBuySell === "sell") {
            unrealizedPnL = totalPremiumPaid - (intrinsicValuePerShare * totalShares);
        }
    }

    return `₹${unrealizedPnL.toFixed(2)}`;
};


// --- ViewTrades Component ---
function ViewTrades() {
    const [expiry, setExpiry] = useState("");
    const [results, setResults] = useState([]);
    const [message, setMessage] = useState("Loading trades...");
    const [stockPrices, setStockPrices] = useState({});
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const navigate = useNavigate();

    const fetchTrades = useCallback(async (searchExpiry = expiry, fetchAll = false) => {
        if (!searchExpiry) {
            setMessage("Please select an expiry date to search.");
            setResults([]);
            setStockPrices({});
            return;
        }
        setMessage(`Fetching trades and current prices for ${searchExpiry}...`);

        try {
            const apiUrl = fetchAll
                ? `http://localhost:8081/trades/all/${searchExpiry}`
                : `http://localhost:8081/trades/${searchExpiry}`;

            const res = await axios.get(apiUrl);
            const fetchedTrades = res.data || [];
            setResults(fetchedTrades);

            if (fetchedTrades.length === 0) {
                setMessage(`No ${fetchAll ? '' : 'open '}trades found for expiry date: ${searchExpiry}.`);
                setStockPrices({});
            } else {
                setMessage(`Displaying ${fetchAll ? 'all ' : 'open '}trades for expiry date: ${searchExpiry}.`);

                const uniqueStockSymbols = [...new Set(fetchedTrades.map(trade => trade.Stock_name))];

                const newStockPrices = {};
                const pricePromises = uniqueStockSymbols.map(async (symbol) => {
                    try {
                        const priceRes = await axios.get(`http://localhost:8081/stock-price/${symbol}`);
                        if (priceRes.data && typeof priceRes.data.currentPrice === 'number') {
                            newStockPrices[symbol] = priceRes.data.currentPrice;
                        } else {
                            console.warn(`No valid price data from backend for ${symbol}. Response:`, priceRes.data);
                            newStockPrices[symbol] = null;
                        }
                    } catch (priceErr) {
                        console.error(`Error fetching price for ${symbol} from backend:`, priceErr.response ? priceErr.response.data : priceErr.message);
                        newStockPrices[symbol] = null;
                    }
                });
                await Promise.allSettled(pricePromises);
                setStockPrices(newStockPrices);
            }
        } catch (err) {
            console.error("Failed to fetch trades:", err);
            setMessage("Failed to fetch trades. Please try again. Ensure your backend server is running and accessible.");
            setResults([]);
            setStockPrices({});
        }
    }, [expiry]);


    useEffect(() => {
        if (isInitialLoad) {
            const defaultExpiryDate = getNextThursdayExpiry(); // Call the helper function
            setExpiry(defaultExpiryDate);
            fetchTrades(defaultExpiryDate, false);
            setIsInitialLoad(false);
        }
    }, [isInitialLoad, fetchTrades]);


    const deleteTrade = (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this trade?");
        if (confirmDelete) {
            console.log("Deleting trade with ID:", id);
            axios.delete(`http://localhost:8081/trades/${id}`)
                .then(res => {
                    console.log("Trade deleted:", res.data.message);
                    setMessage(res.data.message);
                    fetchTrades(expiry, false);
                })
                .catch(err => {
                    console.error("Error deleting trade:", err);
                    setMessage("Failed to delete trade. " + (err.response?.data?.message || err.message));
                });
        }
    };

    const handleEdit = (id) => {
        navigate(`/edit/${id}`);
    };

    const handleCloseClick = (tradeId) => {
        navigate(`/close/${tradeId}`);
    };

    const handleSearchByExpiry = () => {
        fetchTrades(expiry, false);
    };

    const handleSearchAllByExpiry = () => {
        fetchTrades(expiry, true);
    };

    // Groups trades by stock name to display subtotals
    const groupedTrades = results.reduce((acc, trade) => {
        const stockName = trade.Stock_name;
        if (!acc[stockName]) {
            acc[stockName] = [];
        }
        acc[stockName].push(trade);
        return acc;
    }, {});

    // Calculates the grand total premium for all displayed trades
    const totalPremiumGrandTotal = results.reduce((sum, trade) => sum + parseFloat(trade.Total_Premium || 0), 0).toFixed(2);


    return (
        <div className="view-trades-container">
            <h4 className="view-trades-header">Search Results</h4>

            <div className="search-controls">
                <label htmlFor="expiryDate" className="search-label">
                    Select Expiry Date:
                </label>
                <input
                    type="date"
                    id="expiryDate"
                    className="search-input"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                />
                <button
                    className="search-button open-trades-button"
                    onClick={handleSearchByExpiry}
                >
                    Search Open Trades
                </button>
                <button
                    className="search-button all-trades-button"
                    onClick={handleSearchAllByExpiry}
                >
                    Search All Trades
                </button>
            </div>

            {message && (
                <div className="status-message-box">
                    {message}
                </div>
            )}

            <div className="table-responsive-wrapper">
                <table className="trades-data-table">
                    <thead className="table-header-group">
                        <tr className="table-header-row">
                            <th>ID</th>
                            <th>Stock (Current Price)</th>
                            <th>Lot</th>
                            <th>Qty</th>
                            <th>Type</th>
                            <th>Buy/Sell</th>
                            <th>Strike Price</th>
                            <th>Premium</th>
                            <th>Total Premium</th>
                            <th>Expiry</th>
                            <th>P&L / Price Diff (%)</th>
                            <th>Status</th>
                            <th>P&L Value</th>
                            <th>Actions</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.length === 0 ? (
                            <tr className="no-trades-row">
                                <td colSpan="15" className="no-trades-message">
                                    {message}
                                </td>
                            </tr>
                        ) : (
                            Object.entries(groupedTrades).map(([stockName, trades]) => (
                                <React.Fragment key={stockName}>
                                    {trades.map((r) => {
                                        const displayPrice = r.status === 'closed' ? r.closing_price : stockPrices[r.Stock_name];

                                        let percentageDisplay = 'N/A';
                                        let statusContent = null;
                                        let priceDiffColorClass = "text-muted italic-text";
                                        let profitLossValueDisplay = 'N/A';


                                        if (r.status === 'closed') {
                                            percentageDisplay = typeof r.profit_percentage === 'number' ? `${r.profit_percentage.toFixed(2)}%` : 'N/A';
                                            statusContent = getProfitWarning(r);
                                            profitLossValueDisplay = typeof r.profit_or_loss === 'number' ? `₹${r.profit_or_loss.toFixed(2)}` : 'N/A';

                                            if (typeof r.profit_percentage === 'number') {
                                                if (r.profit_percentage < 0) {
                                                    priceDiffColorClass = "text-danger bold-text";
                                                } else if (r.profit_percentage > 0) {
                                                    priceDiffColorClass = "text-success bold-text";
                                                } else {
                                                    priceDiffColorClass = "text-muted";
                                                }
                                            }

                                        } else {
                                            const { percentage, colorClass } = calculatePriceDifference(displayPrice, parseFloat(r.Strike_Price));
                                            percentageDisplay = percentage !== null ? `${percentage}%` : 'N/A';
                                            priceDiffColorClass = colorClass;
                                            statusContent = getProfitWarning(r, displayPrice);
                                            profitLossValueDisplay = calculateCurrentValue(r, displayPrice);
                                        }

                                        return (
                                            <tr key={r.ID} className="trade-data-row">
                                                <td>{r.ID}</td>
                                                <td>
                                                    <div className="stock-name-cell">{r.Stock_name}</div>
                                                    <div className={`current-price-cell ${typeof displayPrice !== 'number' ? 'text-muted' : 'text-primary bold-text'}`}>
                                                        {typeof displayPrice === 'number' ? `(₹${displayPrice.toFixed(2)})` : '(N/A)'}
                                                    </div>
                                                </td>
                                                <td>{r.Lot}</td>
                                                <td>{r.Qty}</td>
                                                <td>{r.Type}</td>
                                                <td>{r.Buy_Sell || 'BUY'}</td>
                                                <td>{r.Strike_Price}</td>
                                                <td>{r.Premium}</td>
                                                <td>{r.Total_Premium}</td>
                                                <td>{r.Expiry ? new Date(r.Expiry).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                <td className={priceDiffColorClass}>
                                                    {percentageDisplay}
                                                </td>
                                                <td>{statusContent}</td>
                                                <td>{profitLossValueDisplay}</td>
                                                <td className="actions-cell">
                                                    <div className="action-buttons-group">
                                                        {r.status === 'open' && (
                                                            <button className="action-button edit-button" onClick={() => handleEdit(r.ID)}>Edit</button>
                                                        )}
                                                        <button className="action-button delete-button" onClick={() => deleteTrade(r.ID)}>Delete</button>
                                                    </div>
                                                </td>
                                                <td className="close-cell">
                                                    {r.status === 'open' && (
                                                        <button
                                                            className="action-button close-button"
                                                            onClick={() => handleCloseClick(r.ID)}
                                                        >
                                                            Close
                                                        </button>
                                                    )}
                                                    {r.status === 'closed' && (
                                                        <span className="closed-status-text">Closed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="stock-subtotal-row">
                                        <td colSpan="8" className="subtotal-label">Total Premium for {stockName}:</td>
                                        <td className="subtotal-value">{trades.reduce((sum, t) => sum + parseFloat(t.Total_Premium || 0), 0).toFixed(2)}</td>
                                        <td colSpan="6" className="subtotal-filler"></td>
                                    </tr>
                                    <tr className="empty-spacer-row">
                                        <td colSpan="15"></td>
                                    </tr>
                                </React.Fragment>
                            ))
                        )}
                        <tr className="grand-total-row">
                            <td colSpan="8" className="grand-total-label">GRAND TOTAL PREMIUM:</td>
                            <td className="grand-total-value">{totalPremiumGrandTotal}</td>
                            <td colSpan="6" className="grand-total-filler"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ViewTrades;
