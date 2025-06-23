// CloseTradePage.js (Your Frontend Component)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function CloseTradePage() {
    const { id } = useParams(); // Get trade ID from URL
    const navigate = useNavigate(); // For navigation
    const [trade, setTrade] = useState(null);
    const [closingPrice, setClosingPrice] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liveUnderlyingPrice, setLiveUnderlyingPrice] = useState(null); // New state for live price

    useEffect(() => {
        const fetchTradeAndLivePrice = async () => {
            try {
                // 1. Fetch trade details from your backend's /trade/:id endpoint
                const tradeRes = await axios.get(`http://localhost:8081/trade/${id}`);
                const fetchedTrade = tradeRes.data;
                setTrade(fetchedTrade);

                // 2. If the trade is 'open' and has a Stock_name, fetch the live underlying stock price
                if (fetchedTrade.status === 'open' && fetchedTrade.Stock_name) {
                    try {
                        // Make a call to your new backend endpoint to get the live price
                        const livePriceRes = await axios.get(`http://localhost:8081/stock-price/${fetchedTrade.Stock_name}`);
                        if (livePriceRes.data && typeof livePriceRes.data.currentPrice === 'number') {
                            setLiveUnderlyingPrice(livePriceRes.data.currentPrice);
                            console.log(`Live price fetched for ${fetchedTrade.Stock_name}: ${livePriceRes.data.currentPrice}`);
                        } else {
                            console.warn(`Backend returned no valid live price for ${fetchedTrade.Stock_name}. Response:`, livePriceRes.data);
                            setLiveUnderlyingPrice(null);
                        }
                    } catch (priceError) {
                        console.warn(`Could not fetch live price for ${fetchedTrade.Stock_name} (ID: ${fetchedTrade.ID}):`, priceError.message);
                        setLiveUnderlyingPrice(null); // Set to null on error to indicate no live price
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching trade details or live price:', err);
                setError('Failed to load trade details. Please check trade ID or backend connection.');
                setLoading(false);
            }
        };
        fetchTradeAndLivePrice();
    }, [id]); // Re-run effect if ID changes

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); // Clear previous messages
        setError(null);

        const price = parseFloat(closingPrice);

        // Allow 0 for option expiring worthless
        if (isNaN(price) || price < 0) {
            setMessage('Please enter a valid non-negative option premium.');
            return;
        }

        setMessage('Submitting closing premium...');
        try {
            // Send the entered 'closingPrice' (which is the option's premium at close) to the backend
            const res = await axios.put(`http://localhost:8081/trades/close/${id}`, { closingPrice: price });

            // Backend now returns profitOrLoss and profitPercentage directly.
            // Update the trade state with the new 'closed' status and the values from the backend.
            const updatedTrade = {
                ...trade,
                status: 'closed',
                closing_price: price, // Store the premium entered by user
                total_closing_value: res.data.totalClosingValue,
                profit_or_loss: res.data.profitOrLoss,      // Use backend calculated value
                profit_percentage: res.data.profitPercentage // Use backend calculated value
            };
            setTrade(updatedTrade); // Update the local trade state

            setMessage(res.data.message);
            console.log('Trade closed successfully. Backend response:', res.data);

            // Optionally navigate back after a short delay to let the user see the message
            setTimeout(() => {
                navigate('/'); // Navigate to your main trades view
            }, 2000); // Navigate after 2 seconds

        } catch (err) {
            console.error('Error closing trade:', err.response ? err.response.data : err.message);
            setError(`Failed to close trade: ${err.response?.data?.message || err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl text-gray-700">Loading trade details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl text-red-500">{error}</p>
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl text-gray-700">Trade not found.</p>
            </div>
        );
    }

    // Use trade.profit_or_loss and trade.profit_percentage directly from the fetched trade object
    // These will be available if the trade is closed and the backend sends them.
    const displayProfitOrLoss = trade.profit_or_loss;
    const displayProfitPercentage = trade.profit_percentage;

    // Determine the text color for profit/loss
    const profitLossTextColor = displayProfitOrLoss !== null
        ? (displayProfitOrLoss >= 0 ? 'text-green-600' : 'text-red-600')
        : 'text-gray-700';

    const profitLossText = displayProfitOrLoss !== null
        ? (displayProfitOrLoss >= 0 ? `Profit: ₹${displayProfitOrLoss.toFixed(2)}` : `Loss: ₹${Math.abs(displayProfitOrLoss).toFixed(2)}`)
        : 'N/A';

    const profitPercentageText = displayProfitPercentage !== null
        ? `${displayProfitPercentage.toFixed(2)}%`
        : 'N/A';


    return (
        <div className="card shadow-lg p-6 bg-light text-dark rounded-4 mt-5 max-w-lg mx-auto">
            <h4 className="card-title mb-6 text-dark text-center text-3xl font-bold">Close Trade: {trade.Stock_name} ({trade.Type})</h4>

            {/* Trade Details Section - Proper Table Structure */}
            <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
                <h5 className="text-xl font-semibold mb-4 text-blue-700 text-center">Trade Details</h5> {/* Centered heading */}

                <table className="min-w-max mx-auto divide-y divide-gray-200">
                    <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Trade ID:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.ID}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Stock Name:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Stock_name}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Trade Type:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Type} ({trade.Buy_Sell || 'BUY'})</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Strike Price:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Strike_Price}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Premium (per share):</td> {/* Clarified label */}
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Premium}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Lot Size:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Lot}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Quantity (Lots):</td> {/* Clarified label */}
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Qty}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Initial Total Premium:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">₹{trade.Total_Premium}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Expiry Date:</td>
                            <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.Expiry ? new Date(trade.Expiry).toLocaleDateString('en-GB') : 'N/A'}</td> {/* Formatted date */}
                        </tr>
                        {/* Display live underlying stock price if available and trade is open */}
                        {liveUnderlyingPrice !== null && trade.status === 'open' && (
                            <tr>
                                <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Underlying Live Price:</td>
                                <td className="px-4 py-2 text-start text-sm text-gray-700">₹{liveUnderlyingPrice.toFixed(2)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <p className="text-base font-bold mt-5 pt-4 border-t border-gray-200 text-gray-800 text-center">
                    <span className="font-semibold text-blue-600">Current Status:</span>{' '}
                    <span className={trade.status === 'open' ? 'text-green-600' : 'text-red-600'}>{trade.status.toUpperCase()}</span>
                </p>
            </div>

            {/* Conditional Rendering for Closed Trade Details - Proper Table Structure */}
            {trade.status === 'closed' && (
                <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h5 className="text-xl font-semibold mb-4 text-blue-700 text-center">Closure Details</h5>
                    <table className="min-w-max mx-auto divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Closed Premium (per share):</td> {/* Updated label */}
                                <td className="px-4 py-2 text-start text-sm text-gray-700">{trade.closing_price ? trade.closing_price.toFixed(2) : 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Total Closing Value:</td>
                                <td className="px-4 py-2 text-start text-sm text-gray-700">₹{trade.total_closing_value ? trade.total_closing_value.toFixed(2) : 'N/A'}</td>
                            </tr>
                            {/* Display Profit/Loss using backend's calculated value */}
                            <tr>
                                <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Profit/Loss:</td>
                                <td className={`px-4 py-2 text-start text-sm font-bold ${profitLossTextColor}`}>
                                    {profitLossText}
                                </td>
                            </tr>
                            {/* Display Profit Percentage using backend's calculated value */}
                            <tr>
                                <td className="px-4 py-2 text-end text-sm font-semibold text-blue-600">Profit %:</td>
                                <td className={`px-4 py-2 text-start text-sm font-bold ${displayProfitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {profitPercentageText}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Conditional Rendering for Close Trade Form or Already Closed Message */}
            {trade.status === 'open' ? (
                <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-200">
                    <div className="mb-6">
                        <label htmlFor="closingPrice" className="block text-gray-800 text-lg font-bold mb-3 text-center">
                            Enter **Option's Closing Premium** (per share): {/* UPDATED LABEL */}
                        </label>
                        <input
                            type="number"
                            id="closingPrice"
                            className="shadow-sm border border-gray-300 rounded-md w-full py-2.5 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                            value={closingPrice}
                            onChange={(e) => setClosingPrice(e.target.value)}
                            placeholder="e.g., 5.25 (premium per share)" // UPDATED PLACEHOLDER
                            step="0.01"
                            required
                        />
                    </div>
                    {message && (
                        <p className={`text-sm text-center mb-5 ${error ? 'text-red-600' : 'text-green-600'} font-medium`}>{message}</p>
                    )}
                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#ffe5e5',
                                color: '#c0392b',
                                border: '1px solid #e74c3c',
                                borderRadius: '6px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease-in-out',
                                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseOver={e => (e.target.style.backgroundColor = '#f8d7da')}
                            onMouseOut={e => (e.target.style.backgroundColor = '#ffe5e5')}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn bg-blue-600 text-white hover:bg-blue-700 py-2 px-5 rounded-md transition duration-200 ease-in-out font-semibold"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            ) : (
                <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-xl text-red-600 font-bold mb-5">This trade is already closed.</p>
                    <button
                        className="btn bg-blue-600 text-white hover:bg-blue-700 py-2 px-5 rounded-md transition duration-200 ease-in-out font-semibold"
                        onClick={() => navigate('/')}
                    >
                        Back to Trades
                    </button>
                </div>
            )}
        </div>
    );
}

export default CloseTradePage;