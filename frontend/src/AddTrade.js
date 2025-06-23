// AddTrade.js (Your Frontend Component)

import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// This data can be moved to a separate file or fetched from an API if it gets very large
const lotSizesData = {
    "RELIANCE.NS": 250, "TCS.NS": 150, "HDFCBANK.NS": 550, "ICICIBANK.NS": 700,
    "INFY.NS": 600, "LT.NS": 425, "SBIN.NS": 1500, "BHARTIARTL.NS": 1400,
    "ITC.NS": 1600, "MARUTI.NS": 50, "NESTLEIND.NS": 75, "BAJFINANCE.NS": 125,
    "ASIANPAINT.NS": 200, "HINDUNILVR.NS": 300, "KOTAKBANK.NS": 800,
    "AXISBANK.NS": 1200, "TECHM.NS": 600, "ULTRACEMCO.NS": 100, "TITAN.NS": 750,
    "WIPRO.NS": 1600, "ADANIENT.NS": 250, "ADANIPORTS.NS": 700, "BRITANNIA.NS": 100,
    "CIPLA.NS": 250, "COALINDIA.NS": 2800, "DRREDDY.NS": 125, "EICHERMOT.NS": 175,
    "GRASIM.NS": 200, "HCLTECH.NS": 700, "HDFCLIFE.NS": 500, "HEROMOTOCO.NS": 100,
    "INDUSINDBK.NS": 800, "JSWSTEEL.NS": 600, "M&M.NS": 600, "NTPC.NS": 2700,
    "ONGC.NS": 1700, "POWERGRID.NS": 2400, "SBILIFE.NS": 750, "SUNPHARMA.NS": 100,
    "TATACONSUM.NS": 600, "TATAMOTORS.NS": 1400, "TATASTEEL.NS": 4250, "UPL.NS": 1300,
    "BAJAJ-AUTO.NS": 25, "BPCL.NS": 1800, "DIVISLAB.NS": 75, "GAIL.NS": 2600,
    "HINDALCO.NS": 1000, "SHREECEM.NS": 25, "APOLLOHOSP.NS": 125, "BHARATFORG.NS": 800,
    "DLF.NS": 900, "LTIM.NS": 100, "MCDOWELL-N.NS": 1000, "PIIND.NS": 200,
    "PEL.NS": 1500, "ZYDUSLIFE.NS": 900, "ZEEL.NS": 3000,
};


function AddTrade() {
    const [trade, setTrade] = useState({
        Stock_name: "",
        Lot: "",
        Strike_Price: "",
        Qty: "",
        Type: "",
        Buy_Sell: "BUY", // Default to BUY
        Premium: "",
        Expiry: "",
    });

    const navigate = useNavigate();

    // Effect to auto-fill Lot size based on Stock_name
    useEffect(() => {
        if (trade.Stock_name) {
            const normalizedSymbol = trade.Stock_name.toUpperCase();
            if (lotSizesData[normalizedSymbol]) {
                setTrade(prevTrade => ({ ...prevTrade, Lot: lotSizesData[normalizedSymbol] }));
            } else {
                setTrade(prevTrade => ({ ...prevTrade, Lot: "" })); // Clear Lot if not found
            }
        } else {
            setTrade(prevTrade => ({ ...prevTrade, Lot: "", Strike_Price: "" })); // Clear both if stock name is empty
        }
    }, [trade.Stock_name]);

    const handleChange = (e) => {
        setTrade({ ...trade, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let currentLot = trade.Lot;
        // Fallback for lot size if not pre-filled by useEffect (e.g., if user types it manually)
        if (!currentLot && trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()]) {
             currentLot = lotSizesData[trade.Stock_name.toUpperCase()];
        }
        if (!currentLot || isNaN(parseFloat(currentLot)) || parseFloat(currentLot) <= 0) {
            alert("Lot size could not be determined or is invalid. Please enter a valid stock symbol or ensure lot size is a positive number.");
            return;
        }

        // Create the payload to send, ensuring Lot uses the determined currentLot
        const tradeToSend = { ...trade, Lot: parseFloat(currentLot) };

        try {
            // FIX: Corrected endpoint URL from "/add" to "/trades"
            const res = await axios.post("http://localhost:8081/add", tradeToSend);
            alert(res.data.message);
            navigate("/view"); // Assuming '/view' is your route to show all trades
        } catch (err) {
            console.error("Error adding trade:", err.response ? err.response.data : err.message);
            alert(`Failed to add trade. ${err.response?.data?.message || err.message}. Please check server console for more details.`);
        }
    };

    // Calculate total premium for display in the form
    const calculatedDisplayTotalPremium =
        (!isNaN(parseFloat(trade.Lot)) && !isNaN(parseFloat(trade.Premium)) && !isNaN(parseInt(trade.Qty)))
            ? (parseFloat(trade.Lot) * parseFloat(trade.Premium) * parseInt(trade.Qty)).toFixed(2)
            : "0.00"; // Display 0.00 if values are incomplete

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
                <div className="card shadow-lg p-4 bg-light text-dark rounded-4 mt-5">
                    <h2 className="card-title text-center mb-4 text-dark">Add New Trade</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="Stock_name" className="form-label fw-bold text-muted">Stock Name:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="Stock_name"
                                name="Stock_name"
                                value={trade.Stock_name}
                                onChange={handleChange}
                                placeholder="e.g., INFY.NS, RELIANCE.NS"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="Lot" className="form-label fw-bold text-muted">Lot:</label>
                            <input
                                type="number"
                                step="1"
                                className="form-control"
                                id="Lot"
                                name="Lot"
                                value={trade.Lot}
                                onChange={handleChange} // Allow manual override if needed
                                readOnly={!!trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()] !== undefined} // Make it readOnly if found
                                disabled={false} // Always enabled for manual input if lookup fails
                                placeholder="Auto-filled or enter manually"
                                required
                            />
                            {trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()] === undefined && (
                                <small className="text-muted">Lot size not found for this stock. Please enter it manually.</small>
                            )}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Buy_Sell" className="form-label fw-bold text-muted">Buy/Sell:</label>
                            <select
                                className="form-select"
                                id="Buy_Sell"
                                name="Buy_Sell"
                                value={trade.Buy_Sell}
                                onChange={handleChange}
                                required
                            >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Type" className="form-label fw-bold text-muted">Type:</label>
                            <select
                                className="form-select"
                                id="Type"
                                name="Type"
                                value={trade.Type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="CALL">CALL</option>
                                <option value="PUT">PUT</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Strike_Price" className="form-label fw-bold text-muted">Strike Price:</label>
                            <input
                                type="number"
                                step="0.01" // Allow decimals
                                className="form-control"
                                id="Strike_Price"
                                name="Strike_Price"
                                value={trade.Strike_Price}
                                onChange={handleChange}
                                placeholder="e.g., 1500, 350.50"
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Qty" className="form-label fw-bold text-muted">Qty (Number of Lots):</label>
                            <input
                                type="number"
                                className="form-control"
                                id="Qty"
                                name="Qty"
                                value={trade.Qty}
                                onChange={handleChange}
                                placeholder="e.g., 1, 2, 5"
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Premium" className="form-label fw-bold text-muted">Premium (per share):</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                id="Premium"
                                name="Premium"
                                value={trade.Premium}
                                onChange={handleChange}
                                placeholder="e.g., 10.50 (premium per share)"
                                required
                            />
                        </div>

                        {(trade.Lot && trade.Premium && trade.Qty) && (
                            <div className="mb-3">
                                <label htmlFor="Total_Premium_display" className="form-label fw-bold text-muted">Calculated Total Premium:</label>
                                <input
                                    type="text"
                                    className="form-control bg-light"
                                    id="Total_Premium_display"
                                    value={calculatedDisplayTotalPremium}
                                    readOnly
                                />
                            </div>
                        )}
                        <div className="mb-3">
                            <label htmlFor="Expiry" className="form-label fw-bold text-muted">Expiry Date:</label>
                            <input
                                type="date"
                                className="form-control"
                                id="Expiry"
                                name="Expiry"
                                value={trade.Expiry}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg w-100 mt-3 shadow-sm">Submit Trade</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AddTrade;