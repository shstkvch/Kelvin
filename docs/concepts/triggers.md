# Triggers

Triggers are your escape hatch from Kelvin to custom JavaScript code. Use them for sending emails, calling external APIs, or any logic that can't be expressed declaratively.

::: warning Planned Feature
Triggers are parsed but execution is not yet implemented in the MVP.
:::

## Basic Usage

Call a trigger from an action's `then` block:

```kelvin
action confirm(booking: Booking) {
  then {
    booking.status = 'confirmed'
    trigger('send_confirmation', booking)
    trigger('charge_payment', booking)
  }
}
```

## Implementing Triggers

Triggers live in the `triggers/` directory as JavaScript files:

```javascript
// triggers/send_confirmation.js

export default async function(booking, { email }) {
  await email.send({
    to: booking.customer.email,
    subject: 'Booking Confirmed',
    template: 'booking_confirmed',
    data: {
      name: booking.customer.name,
      event: booking.event.title,
      date: booking.date,
      tickets: booking.tickets,
    }
  });
}
```

## Trigger Context

Triggers receive utilities as the second argument:

| Utility | Description |
|---------|-------------|
| `db` | Database queries and updates |
| `email` | Send emails |
| `http` | Make HTTP requests |
| `log` | Structured logging |
| `env` | Environment variables |

### Database Access

```javascript
// triggers/update_stats.js

export default async function(post, { db }) {
  // Update author's post count
  const author = await db.get('users', post.author_id);
  const count = await db.count('posts', { author_id: post.author_id });

  await db.update('users', author.id, {
    post_count: count
  });
}
```

### HTTP Requests

```javascript
// triggers/charge_payment.js

export default async function(booking, { http, db }) {
  const response = await http.post('https://payments.example.com/charge', {
    amount: booking.total,
    currency: 'GBP',
    customer_email: booking.customer.email,
  });

  await db.update('bookings', booking.id, {
    payment_id: response.payment_id,
    payment_status: 'charged'
  });
}
```

### Email Sending

```javascript
// triggers/welcome_email.js

export default async function(user, { email }) {
  await email.send({
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome',
    data: {
      name: user.name || 'there',
    }
  });
}
```

### Environment Variables

```javascript
// triggers/notify_slack.js

export default async function(issue, { http, env }) {
  await http.post(env.SLACK_WEBHOOK_URL, {
    text: `New issue: ${issue.title}`,
    channel: '#support'
  });
}
```

## Webhook Triggers

Instead of JavaScript, triggers can call external webhooks:

```yaml
# kelvin.yaml

triggers:
  send_confirmation: https://hooks.example.com/confirmation
  charge_payment: https://hooks.example.com/payment
```

Kelvin POSTs the entity data as JSON to the URL.

## Common Patterns

### Send Notification on Create

```kelvin
create Post as post {
  input: title, body

  then {
    post.author = current_user
    trigger('notify_followers', post)
  }
}
```

### Audit Trail

```kelvin
action approve(application: Application) {
  then {
    application.status = 'approved'
    trigger('log_audit', {
      action: 'approve',
      entity: 'application',
      entity_id: application.id,
      user: current_user.id,
      timestamp: now()
    })
  }
}
```

### External Integration

```kelvin
action ship(order: Order) {
  require: order.status == 'paid'

  then {
    order.status = 'shipping'
    trigger('create_shipment', order)
    trigger('send_shipping_notification', order)
  }
}
```

## Error Handling

Triggers run asynchronously. If a trigger fails:

1. The action still completes (data is saved)
2. The error is logged
3. You can implement retry logic in your trigger code

For critical operations, check status in your trigger:

```javascript
// triggers/charge_payment.js

export default async function(booking, { http, db, log }) {
  try {
    const response = await http.post('https://payments.example.com/charge', {
      amount: booking.total,
    });

    await db.update('bookings', booking.id, {
      payment_status: 'success',
      payment_id: response.payment_id,
    });
  } catch (error) {
    log.error('Payment failed', { booking_id: booking.id, error });

    await db.update('bookings', booking.id, {
      payment_status: 'failed',
      payment_error: error.message,
    });
  }
}
```

## Next Steps

- [Actions](/concepts/actions) — Where triggers are called from
- [Cookbooks](/cookbooks/) — Practical trigger examples
