import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const frontend_url = process.env.FRONTEND_URL || "http://localhost:5173";

const placeOrder = async (req, res) => {
    try {
        // Log req.body to check the structure
        console.log('Order Items:', req.body.items);

        // Create a new order
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
        });
        await newOrder.save();

        // Clear the user's cart after order placement
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Prepare line items for the Stripe payment session
        const line_items = req.body.items.map((item) => {
            console.log('Item being processed:', item); // Log each item for debugging
            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: item.name
                    },
                    unit_amount: Math.round(item.price * 100 * 80), // Convert price to cents/paise
                },
                quantity: item.quantity,
            };
        });

        // Add delivery charges
        line_items.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: Math.round(2 * 100 * 80), // Assuming delivery charge (convert if needed)
            },
            quantity: 1,
        });

        // Log the final line_items array to ensure it’s correct
        console.log('Final line_items array:', line_items);

        // Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Specify payment methods
            line_items: line_items,
            mode: "payment",
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        });

        // Respond with session URL
        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error processing order" });
    }
};


const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success == "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" })
        }
        else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({ success: false, message: "Not Paid" })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}


const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId })
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);

        res.json({ success: false, message: "Error" })
    }
}

const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })

    }
}

const updateStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status })
        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}


export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
