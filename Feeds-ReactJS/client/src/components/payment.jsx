import React, { useEffect, useState } from 'react';
import '../styles/payment.css';
import { useRazorpay } from 'react-razorpay';

const PaymentPage = () => {
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const fetchCoins = async () => {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/getCoins`, {
        credentials: 'include',
      });
      const data = await res.json();
      // 100 coins = 1 rupee 
      const coins = data.coins / 100;
      setCoins(coins);
    };
    fetchCoins();
  }, []);
  const { Razorpay } = useRazorpay();
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(1);
  const [amountInfo, setAmountInfo] = useState({
    original: 0,
    discounted: 0,
    months: 0,
    name: '',
  });

  const planConfig = [
    { name: 'Monthly', price: 199, months: 1 },
    { name: 'Semi-Annualy', price: 169, months: 6 },
    { name: 'Yearly', price: 149, months: 12 },
  ];

  useEffect(() => {
    const plan = planConfig[selectedPlanIndex];
    const original = plan.price * plan.months;
    const discounted = Math.max(0, original - coins);
    setAmountInfo({
      original,
      discounted,
      months: plan.months,
      name: plan.name,
    });
  }, [selectedPlanIndex, coins]);

  const handlePlanSelect = index => {
    setSelectedPlanIndex(index);
  };

  const handlePayment = async () => {
    const plan = planConfig[selectedPlanIndex];
    const plan_price = amountInfo.discounted.toFixed(2);
    const plan_name = plan.name;

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name, plan_price }),
      });
      const data = await res.json();
      if (!data.order) {
        alert('Error creating order.');
        return;
      }

      const options = {
        key: 'rzp_test_f7KvjxjG0mJxq1',
        amount: data.order.amount,
        currency: 'INR',
        name: 'ARNAV RANJAN',
        description: 'Purchase Premium Membership',
        order_id: data.order.id,
        handler: function (response) {
          alert(
            'Payment Successful! Payment ID: ' + response.razorpay_payment_id,
          );
          fetch(`${import.meta.env.VITE_SERVER_URL}/verify_payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              username: data.order.username,
            }),
          });
        },
        theme: { color: '#3399cc' },
      };

      const rzp1 = new Razorpay(options);
      rzp1.open();
    } catch (err) {
      console.error(err);
      alert('Payment error (see console).');
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h1>Choose Premium Plan</h1>
        <p>Select your preferred subscription plan</p>
      </div>

      <div className="plans-container">
        {planConfig.map((plan, idx) => (
          <div
            key={idx}
            className={`plan ${selectedPlanIndex === idx ? 'selected' : ''}`}
            onClick={() => handlePlanSelect(idx)}
          >
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">₹{plan.price}</div>
            <div className="plan-duration">
              per {plan.months > 1 ? 'month' : 'month'}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '20px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '50%',
            justifyContent: 'center',
            padding: '20px 10px',
            textAlign: 'center',
            border: '2px solid black',
            borderRadius: '20px',
          }}
        >
          <h3 style={{ marginBottom: '10px', fontSize: '18px', color: '#444' }}>
            Premium Features:
          </h3>
          <ul
            style={{
              listStyle: 'none',
              paddingLeft: 0,
              fontSize: '16px',
              color: '#333',
            }}
          >
            <li style={{ margin: '8px 0' }}>✔️ Ad-free experience</li>
            <li style={{ margin: '8px 0' }}>✔️ Customized Wallpapers</li>
            <li style={{ margin: '8px 0' }}>✔️ Priority customer support</li>
            <li style={{ margin: '8px 0' }}>
              ✔️ Notification on who viewed your profile
            </li>
            <li style={{ margin: '8px 0' }}>
              ✔️ Create unlimited channels
            </li>
          </ul>
        </div>
      </div>

      <div className="total-amount" style={{ textAlign: 'center' }}>
        <div>Total Amount</div>
        <div style={{ color: 'rgb(25, 68, 240)' }}>
          Your wallet has {coins} coins !!!
        </div>
        <div>
          <span
            id="original-amount"
            style={{
              textDecoration: 'line-through',
              color: '#888',
              fontSize: '18px',
              marginRight: '8px',
            }}
          >
            ₹{amountInfo.original.toFixed(2)}
          </span>
          <span style={{ color: 'green', fontWeight: 600 }}>- {coins}</span>
          <span
            id="discounted-amount"
            style={{
              fontWeight: 700,
              fontSize: '22px',
              marginLeft: '8px',
              color: '#2a7a2a',
            }}
          >
            ₹{amountInfo.discounted.toFixed(2)}
          </span>
        </div>
        <div id="amount-duration">
          ({amountInfo.months} month{amountInfo.months > 1 ? 's' : ''})
        </div>
      </div>

      <button
        type="button"
        id="pay-btn"
        className="submit-btn"
        onClick={handlePayment}
      >
        Subscribe Now
      </button>

      <div className="secure-badge">
        🔒 Secure payment powered by{' '}
        <a href="https://razorpay.com/" target="_blank" rel="noreferrer">
          Razorpay
        </a>
      </div>
    </div>
  );
};

export default PaymentPage;
