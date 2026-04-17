import Razorpay from "razorpay";

var instance = new Razorpay({
    key_id: 'rzp_test_f7KvjxjG0mJxq1',
    key_secret: 'a3mvknW8zlMXVxmVYXP70hhe',
    headers: {
      "X-Razorpay-Account": 'OtbThCaCCBqjoR'
    }
  });

export {instance}