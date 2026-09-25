const express = require('express');
const router = express.Router();
const axios = require('axios');

const BACKEND_URL =
    process.env.TRAVELBUDDY_BACKEND_URL || 'http://localhost:5000';

// ---------------------------------------------------------
// Webhook Verification
// ---------------------------------------------------------

router.get('/', (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        }

        return res.sendStatus(403);
    }

    return res.sendStatus(400);
});

// ---------------------------------------------------------
// Incoming WhatsApp Messages
// ---------------------------------------------------------

router.post('/', async (req, res) => {
    try {
        const body = req.body;

        if (!body.object) {
            return res.sendStatus(404);
        }

        const value = body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];

        if (!message) {
            return res.sendStatus(200);
        }

        const phoneNumberId = value?.metadata?.phone_number_id;
        const from = message.from;
        const msgBody = message.text?.body;
        const messageId = message.id;

        console.log('WEBHOOK RECEIVED:', messageId, msgBody);

        if (!phoneNumberId || !from || !msgBody || !messageId) {
            return res.sendStatus(200);
        }

        // Acknowledge WhatsApp immediately.
        res.sendStatus(200);

        try {
            // -------------------------------------------------
            // Send the trip request to the common backend first.
            // -------------------------------------------------

            const response = await axios.post(
                `${BACKEND_URL}/api/whatsapp/process-trip`,
                {
                    phoneNumber: from,
                    messageId,
                    message: msgBody
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            const result = response.data;

            // -------------------------------------------------
            // Tell the user that processing has started.
            // -------------------------------------------------

            await sendWhatsAppMessage(
                phoneNumberId,
                from,
                "I'm working on your trip... Give me a few seconds! ✈️"
            );

            // -------------------------------------------------
            // Duplicate message
            // -------------------------------------------------

            if (result.duplicate) {
                console.log(
                    'Duplicate message ignored:',
                    messageId
                );
                return;
            }

            // -------------------------------------------------
            // Backend could not understand the request
            // -------------------------------------------------

            if (!result.tripCreated) {
                await sendWhatsAppMessage(
                    phoneNumberId,
                    from,
                    "Sorry, I couldn't understand that. Try something like: 'Plan a 3-day trip to Rishikesh under ₹10,000'"
                );

                return;
            }

            // -------------------------------------------------
            // Trip successfully created
            // -------------------------------------------------

            const baseUrl =
                process.env.PUBLIC_BASE_URL ||
                `http://localhost:${process.env.PORT || 3000}`;

            const tripLink =
                `${baseUrl}/planner.html?tripId=${result.tripId}`;

            const replyText =
                `✅ Your ${result.days}-day trip to ${result.destination} is ready!\n\n` +
                `View and edit your full itinerary here:\n${tripLink}`;

            await sendWhatsAppMessage(
                phoneNumberId,
                from,
                replyText
            );

        } catch (error) {
            console.error(
                'WhatsApp backend processing error:',
                error.response?.data || error.message
            );

            await sendWhatsAppMessage(
                phoneNumberId,
                from,
                'Sorry, I was unable to create your trip right now. Please try again.'
            );
        }

    } catch (error) {
        console.error(
            'Webhook processing error:',
            error
        );

        // WhatsApp has already received HTTP 200.
    }
});

// ---------------------------------------------------------
// Send WhatsApp Message
// ---------------------------------------------------------

async function sendWhatsAppMessage(phoneId, to, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v17.0/${phoneId}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                text: {
                    body: text
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type':
                        'application/json'
                }
            }
        );
    } catch (error) {
        console.error(
            'Error sending WhatsApp message:',
            error.response
                ? error.response.data
                : error.message
        );
    }
}

module.exports = router;