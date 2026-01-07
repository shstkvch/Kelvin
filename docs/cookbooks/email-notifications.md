# Email Notifications

Send emails when actions happen in your app.

::: warning Planned Feature
Triggers are parsed but execution is not yet implemented in the MVP.
:::

## Problem

You want to send email notifications when users perform certain actions — like welcome emails, order confirmations, or status updates.

## Solution

Use triggers to call external email services or your own email-sending code.

## Basic Setup

### 1. Define the Trigger in Kelvin

```kelvin
app Orders {
  entity User {
    email: email
    name: text(1..100)
  }

  entity Order {
    status: enum('pending', 'confirmed', 'shipped') = 'pending'
    total: money
    customer: User
  }

  view orders {
    action confirm(order: Order) {
      require: order.status == 'pending'

      then {
        order.status = 'confirmed'
        trigger('send_order_confirmation', order)
      }
    }

    action ship(order: Order) {
      require: order.status == 'confirmed'

      then {
        order.status = 'shipped'
        trigger('send_shipping_notification', order)
      }
    }
  }
}
```

### 2. Implement the Trigger

```javascript
// triggers/send_order_confirmation.js

export default async function(order, { email, db }) {
  // Get the customer with their email
  const customer = await db.get('users', order.customer_id);

  await email.send({
    to: customer.email,
    subject: `Order #${order.id} Confirmed`,
    template: 'order_confirmed',
    data: {
      name: customer.name,
      orderId: order.id,
      total: order.total,
    }
  });
}
```

### 3. Email Templates

Create email templates in `templates/`:

```html
<!-- templates/order_confirmed.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Order Confirmed</title>
</head>
<body>
  <h1>Thanks for your order, {{name}}!</h1>
  <p>Your order #{{orderId}} has been confirmed.</p>
  <p>Total: ${{total}}</p>
</body>
</html>
```

## Using External Email Services

### SendGrid

```javascript
// triggers/send_order_confirmation.js

import sgMail from '@sendgrid/mail';

export default async function(order, { db, env }) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);

  const customer = await db.get('users', order.customer_id);

  await sgMail.send({
    to: customer.email,
    from: 'orders@myapp.com',
    subject: `Order #${order.id} Confirmed`,
    html: `<h1>Thanks, ${customer.name}!</h1><p>Order confirmed.</p>`,
  });
}
```

### Postmark

```javascript
// triggers/send_welcome.js

import postmark from 'postmark';

export default async function(user, { env }) {
  const client = new postmark.ServerClient(env.POSTMARK_API_KEY);

  await client.sendEmail({
    From: 'hello@myapp.com',
    To: user.email,
    Subject: 'Welcome to MyApp!',
    HtmlBody: `<h1>Welcome, ${user.name}!</h1>`,
  });
}
```

### Webhook to External Service

Instead of code, use a webhook:

```yaml
# kelvin.yaml

triggers:
  send_order_confirmation: https://api.myemailservice.com/webhook/orders
  send_welcome: https://api.myemailservice.com/webhook/welcome
```

Kelvin POSTs the entity data as JSON.

## Common Patterns

### Welcome Email on Registration

Use a `then` block in create:

```kelvin
create User as user {
  input: email, name, password

  then {
    trigger('send_welcome', user)
  }
}
```

### Password Reset

```kelvin
action request_reset(user: User) {
  then {
    user.reset_token = generate()
    user.reset_expires = now() + 3600  -- 1 hour
    trigger('send_reset_email', user)
  }
}
```

```javascript
// triggers/send_reset_email.js
export default async function(user, { email, env }) {
  const resetUrl = `${env.APP_URL}/reset?token=${user.reset_token}`;

  await email.send({
    to: user.email,
    subject: 'Reset Your Password',
    template: 'password_reset',
    data: {
      name: user.name,
      resetUrl,
    }
  });
}
```

### Digest Emails

For daily/weekly digests, use a scheduled trigger:

```javascript
// triggers/send_daily_digest.js (run via cron)
export default async function(_, { db, email }) {
  const users = await db.all('users', { digest_enabled: true });

  for (const user of users) {
    const items = await db.all('items', {
      user_id: user.id,
      created: { $gte: oneDayAgo() }
    });

    if (items.length > 0) {
      await email.send({
        to: user.email,
        subject: 'Your Daily Digest',
        template: 'daily_digest',
        data: { items }
      });
    }
  }
}
```

## Error Handling

Emails can fail. Handle gracefully:

```javascript
// triggers/send_order_confirmation.js

export default async function(order, { email, db, log }) {
  const customer = await db.get('users', order.customer_id);

  try {
    await email.send({
      to: customer.email,
      subject: `Order #${order.id} Confirmed`,
      template: 'order_confirmed',
      data: { order, customer }
    });

    await db.update('orders', order.id, {
      confirmation_sent: true,
      confirmation_sent_at: new Date()
    });
  } catch (error) {
    log.error('Failed to send confirmation email', {
      orderId: order.id,
      error: error.message
    });

    await db.update('orders', order.id, {
      confirmation_sent: false,
      confirmation_error: error.message
    });
  }
}
```

## Testing Locally

Use a service like Mailhog for local email testing:

```yaml
# docker-compose.yml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

Configure your email to use `localhost:1025` in development.

## Related

- [Triggers Reference](/concepts/triggers) — Trigger context and utilities
- [Actions Reference](/concepts/actions) — Triggering from actions
