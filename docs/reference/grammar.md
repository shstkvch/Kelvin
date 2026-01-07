# Grammar Reference

Formal grammar for the Kelvin language.

## Syntax Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Keywords | lowercase | `entity`, `view`, `show` |
| Entity names | PascalCase | `User`, `BlogPost` |
| Field names | snake_case | `first_name`, `created_at` |
| View names | snake_case | `admin`, `my_bookings` |
| String literals | Single quotes | `'pending'`, `'admin'` |
| Comments | `--` | `-- this is a comment` |

## Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equals | `status == 'active'` |
| `!=` | Not equals | `role != 'guest'` |
| `>` | Greater than | `price > 100` |
| `>=` | Greater than or equal | `age >= 18` |
| `<` | Less than | `stock < 10` |
| `<=` | Less than or equal | `date <= today()` |
| `in` | In list | `status in ('pending', 'active')` |
| `and` | Logical AND | `active and published` |
| `or` | Logical OR | `admin or moderator` |
| `not` | Logical NOT | `not archived` |
| `!` | Boolean negation | `task.done = !task.done` |
| `..` | Range | `int(1..100)` |
| `?` | Optional modifier | `phone?` |
| `=` | Default/assignment | `status = 'draft'` |

## BNF Grammar

```bnf
<app> ::= "app" <identifier> "{" <app-body> "}"

<app-body> ::= (<config> | <entity> | <view>)*

<config> ::= "config" "{" <config-option>* "}"

<config-option> ::= <identifier> ":" <literal>

<entity> ::= "entity" <pascal-identifier> "{" <entity-body> "}"

<entity-body> ::= (<field> | <validation>)*

<field> ::= <identifier> ":" <type> <optional>? <default>?

<type> ::= <primitive-type>
         | <text-type>
         | <int-type>
         | <enum-type>
         | <entity-ref>
         | <entity-list>

<primitive-type> ::= "email" | "phone" | "url" | "bool" | "date"
                   | "time" | "timestamp" | "money" | "uuid"

<text-type> ::= "text" "(" <range> ")"

<int-type> ::= "int" "(" <range> ")"

<range> ::= <number>? ".." <number>?

<enum-type> ::= "enum" "(" <string-list> ")"

<string-list> ::= <string> ("," <string>)*

<entity-ref> ::= <pascal-identifier>

<entity-list> ::= "[" <pascal-identifier> "]" ("via" <identifier>)?

<optional> ::= "?"

<default> ::= "=" <expression>

<validation> ::= "validate" <condition>

<view> ::= "view" <identifier> <inline-require>? "{" <view-body> "}"

<inline-require> ::= "require" <condition>

<view-body> ::= <visibility>? <require-block>? <block>*

<visibility> ::= "visibility" ":" ("public" | "authenticated")

<require-block> ::= "require" "{" <condition>* "}"
                  | "require" ":" <condition>

<block> ::= <list-block>
          | <detail-block>
          | <create-block>
          | <edit-block>
          | <action-block>

<list-block> ::= "list" <pascal-identifier> "{" <list-body> "}"

<list-body> ::= <show>? <where>? <order-by>? <filter-by>? <actions>?

<show> ::= "show" ":" <field-list>

<field-list> ::= (<identifier> | <field-path> | "*") ("," (<identifier> | <field-path>))*

<field-path> ::= <identifier> "." <identifier> ("." <identifier>)*

<where> ::= "where" ":" <condition>
          | "where" "{" <condition>* "}"

<order-by> ::= "order" "by" ":" <order-spec> ("," <order-spec>)*

<order-spec> ::= <identifier> ("asc" | "desc")?

<filter-by> ::= "filter" "by" ":" <identifier> ("," <identifier>)*

<actions> ::= "actions" ":" <identifier> ("," <identifier>)*

<detail-block> ::= "detail" <pascal-identifier> ("as" <identifier>)? "{"
                   <detail-body>
                 "}"

<detail-body> ::= <show>? <where>? <block>*

<create-block> ::= "create" <pascal-identifier> ("as" <identifier>)? "{"
                   <create-body>
                 "}"

<create-body> ::= <input> <then-block>?

<input> ::= "input" ":" <identifier> ("," <identifier>)*

<edit-block> ::= "edit" <pascal-identifier> ("as" <identifier>)? "{"
                 <edit-body>
               "}"

<edit-body> ::= <require-block>? <input>?

<action-block> ::= "action" <identifier> "(" <param> ")" "{"
                   <action-body>
                 "}"

<param> ::= <identifier> ":" <pascal-identifier>

<action-body> ::= <require-block>? <input>? <then-block>?

<then-block> ::= "then" "{" <statement>* "}"

<statement> ::= <assignment>
              | <trigger-call>

<assignment> ::= <field-path> "=" <expression>

<trigger-call> ::= "trigger" "(" <string> "," <identifier> ")"

<condition> ::= <expression> <comparison-op> <expression>
              | <expression> "in" "(" <expression-list> ")"
              | <expression> "in" "[" <expression-list> "]"
              | <expression>
              | <condition> "and" <condition>
              | <condition> "or" <condition>
              | "not" <condition>
              | "(" <condition> ")"

<comparison-op> ::= "==" | "!=" | ">" | ">=" | "<" | "<="

<expression> ::= <literal>
               | <identifier>
               | <field-path>
               | <function-call>
               | "!" <expression>
               | <expression> <arithmetic-op> <expression>

<arithmetic-op> ::= "+" | "-" | "*" | "/"

<function-call> ::= <identifier> "(" <expression-list>? ")"

<expression-list> ::= <expression> ("," <expression>)*

<literal> ::= <string> | <number> | <boolean>

<string> ::= "'" <characters> "'"

<number> ::= <digit>+ ("." <digit>+)?

<boolean> ::= "true" | "false"

<identifier> ::= <lower> (<lower> | <digit> | "_")*

<pascal-identifier> ::= <upper> (<letter> | <digit>)*

<letter> ::= <lower> | <upper>

<lower> ::= "a" | "b" | ... | "z"

<upper> ::= "A" | "B" | ... | "Z"

<digit> ::= "0" | "1" | ... | "9"
```

## Reserved Keywords

These words cannot be used as identifiers:

```
app
entity
view
config
list
detail
create
edit
action
trigger
show
where
order
by
filter
actions
input
then
validate
require
visibility
public
authenticated
as
via
and
or
not
in
asc
desc
true
false
null
current_user
role
```

## Comments

```kelvin
-- This is a line comment
entity Post {
  title: text(1..200)  -- inline comment
}
```

Only line comments (starting with `--`) are supported. There are no block comments.
