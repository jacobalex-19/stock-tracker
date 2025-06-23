import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

// --- Predefined Lot Sizes for common NSE Nifty 50 Stocks ---
const lotSizesData = {
    "RELIANCE.NS": 250,
    "TCS.NS": 150,
    "HDFCBANK.NS": 550,
    "ICICIBANK.NS": 700,
    "INFY.NS": 600,
    "LT.NS": 425,
    "SBIN.NS": 1500,
    "BHARTIARTL.NS": 1400,
    "ITC.NS": 3200,
    "MARUTI.NS": 50,
    "NESTLEIND.NS": 75,
    "BAJFINANCE.NS": 125,
    "ASIANPAINT.NS": 200,
    "HINDUNILVR.NS": 300,
    "KOTAKBANK.NS": 800,
    "AXISBANK.NS": 1200,
    "TECHM.NS": 600,
    "ULTRACEMCO.NS": 100,
    "TITAN.NS": 750,
    "WIPRO.NS": 1600,
    "ADANIENT.NS": 250,
    "ADANIPORTS.NS": 700,
    "BRITANNIA.NS": 100,
    "CIPLA.NS": 250,
    "COALINDIA.NS": 2800,
    "DRREDDY.NS": 125,
    "EICHERMOT.NS": 175,
    "GRASIM.NS": 200,
    "HCLTECH.NS": 700,
    "HDFCLIFE.NS": 500,
    "HEROMOTOCO.NS": 100,
    "INDUSINDBK.NS": 800,
    "JSWSTEEL.NS": 600,
    "M&M.NS": 600,
    "NTPC.NS": 2700,
    "ONGC.NS": 1700,
    "POWERGRID.NS": 2400,
    "SBILIFE.NS": 750,
    "SUNPHARMA.NS": 100,
    "TATACONSUM.NS": 600,
    "TATAMOTORS.NS": 1400,
    "TATASTEEL.NS": 4250,
    "UPL.NS": 1300,
    "BAJAJ-AUTO.NS": 25,
    "BPCL.NS": 1800,
    "DIVISLAB.NS": 75,
    "GAIL.NS": 2600,
    "HINDALCO.NS": 1000,
    "SHREECEM.NS": 25,
    "APOLLOHOSP.NS": 125,
    "BHARATFORG.NS": 800,
    "DLF.NS": 900,
    "LTIM.NS": 100,
    "MCDOWELL-N.NS": 1000,
    "PIIND.NS": 200,
    "PEL.NS": 1500,
    "ZYDUSLIFE.NS": 900,
    "ZEEL.NS": 3000,
};

function EditTrade() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trade, setTrade] = useState({
        Stock_name: "",
        Lot: "", // This will be auto-filled
        Strike_Price: "", // Reverted to simple input
        Qty: "",
        Type: "",
        Buy_Sell: "",
        Premium: "",
        Expiry: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Removed states for availableStrikes, strikesLoading, strikesError

    // Effect to fetch initial trade data and then set lot size
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const fetchTradeAndSetLot = async () => {
            try {
                setLoading(true);
                // 1. Fetch existing trade data
                const res = await axios.get(`http://localhost:8081/trade/${id}`);
                const fetchedTrade = res.data;
                fetchedTrade.Expiry = fetchedTrade.Expiry ? new Date(fetchedTrade.Expiry).toISOString().split('T')[0] : '';

                // --- Auto-fill Lot Size (for the fetched trade) ---
                const normalizedSymbol = fetchedTrade.Stock_name.toUpperCase();
                if (lotSizesData[normalizedSymbol]) {
                    fetchedTrade.Lot = lotSizesData[normalizedSymbol];
                } else {
                    fetchedTrade.Lot = fetchedTrade.Lot || "";
                }

                setTrade(fetchedTrade);
                setLoading(false);

                // Removed strike price fetching logic from here
            } catch (err) {
                console.error("Error fetching trade for edit:", err.response ? err.response.data : err.message);
                setError("Failed to load trade data. Please check server console.");
                setLoading(false);
            }
        };
        fetchTradeAndSetLot();
    }, [id]);

    const handleChange = (e) => {
        setTrade({ ...trade, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let currentLot = trade.Lot;
        if (!currentLot && trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()]) {
             currentLot = lotSizesData[trade.Stock_name.toUpperCase()];
        }
        if (!currentLot) {
            alert("Lot size could not be determined. Please ensure lot size is available.");
            return;
        }

        const tradeToSend = { ...trade, Lot: currentLot };

        try {
            const res = await axios.put(`http://localhost:8081/edit/${id}`, tradeToSend);
            alert(res.data.message);
            navigate("/view");
        } catch (err) {
            console.error("Error updating trade:", err.response ? err.response.data : err.message);
            alert("Failed to update trade. Please check server console.");
        }
    };

    const calculatedDisplayTotalPremium =
        (!isNaN(parseFloat(trade.Lot)) && !isNaN(parseFloat(trade.Premium)) && !isNaN(parseInt(trade.Qty)))
            ? (parseFloat(trade.Lot) * parseFloat(trade.Premium) * parseInt(trade.Qty)).toFixed(2)
            : "";

    if (loading) {
        return <div className="text-center mt-5 text-info">Loading trade data...</div>;
    }

    if (error) {
        return <div className="text-center mt-5 text-danger">{error}</div>;
    }

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
                <div className="card shadow-lg p-4 bg-light text-dark rounded-4 mt-5">
                    <h2 className="card-title text-center mb-4 text-dark">Edit Trade (ID: {id})</h2>
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
                                required
                                readOnly // Stock_name is read-only in edit mode
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
                                readOnly
                                disabled={!!trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()] !== undefined}
                            />
                            {trade.Stock_name && lotSizesData[trade.Stock_name.toUpperCase()] === undefined && (
                                <small className="text-muted">Lot size not found for this stock. Please confirm or leave blank for now.</small>
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

                        {/* Reverted Strike Price to a simple number input */}
                        <div className="mb-3">
                            <label htmlFor="Strike_Price" className="form-label fw-bold text-muted">Strike Price:</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                id="Strike_Price"
                                name="Strike_Price"
                                value={trade.Strike_Price}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="Qty" className="form-label fw-bold text-muted">Qty:</label>
                            <input
                                type="number"
                                className="form-control"
                                id="Qty"
                                name="Qty"
                                value={trade.Qty}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="Premium" className="form-label fw-bold text-muted">Premium:</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                id="Premium"
                                name="Premium"
                                value={trade.Premium}
                                onChange={handleChange}
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
                            <label htmlFor="Expiry" className="form-label fw-bold text-muted">Expiry:</label>
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
                        <button type="submit" className="btn btn-primary btn-lg w-100 mt-3 shadow-sm">Update Trade</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditTrade;