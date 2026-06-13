/**
 * Built-in DSL templates. The first is also the onboarding document loaded on
 * first visit, so a new user sees a rendered diagram immediately.
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  /** Emoji used as a tiny icon in the template menu. */
  icon: string;
  code: string;
}

/** Onboarding document — friendly, annotated, renders something interesting. */
export const WELCOME_DOC = `# Welcome to ArchViz!
# Describe your system in plain text — the diagram updates live.
# Edit anything below, or pick a template from the toolbar.

direction LR

User [external] "User"
Web [service] "Web App"
API [service] "API Server"
Cache [cache] "Redis"
DB [database] "PostgreSQL"
Queue [queue] "Job Queue"
Worker [service] "Background Worker"

User -> Web : visits
Web -> API : HTTPS
API -> Cache : read / write
API -> DB : SQL
API --> Queue : enqueue job
Queue --> Worker : dispatch
Worker -> DB : update
`;

export const TEMPLATES: Template[] = [
  {
    id: 'microservices',
    name: 'Microservices',
    description: 'API gateway fronting independent services with their own stores',
    icon: '🧩',
    code: `direction LR

group Clients {
  Web [external] "Web App"
  Mobile [external] "Mobile App"
}

Gateway [service] "API Gateway"

group Services {
  Auth [service] "Auth Service"
  Orders [service] "Order Service"
  Payments [service] "Payment Service"
}

OrdersDB [database] "Orders DB"
PaymentsDB [database] "Payments DB"
Cache [cache] "Redis"
Events [queue] "Event Bus"

Web -> Gateway : HTTPS
Mobile -> Gateway : HTTPS
Gateway -> Auth : verify
Gateway -> Orders : REST
Gateway -> Payments : REST
Orders -> OrdersDB : SQL
Payments -> PaymentsDB : SQL
Orders -> Cache : read / write
Orders --> Events : publish
Payments --> Events : publish
`,
  },
  {
    id: 'mvc',
    name: 'Classic MVC',
    description: 'The request lifecycle through a Model–View–Controller stack',
    icon: '🏛️',
    code: `direction TD

Browser [external] "Browser"
Router [service] "Router"
Controller [service] "Controller"
Model [service] "Model"
View [service] "View"
DB [database] "Database"

Browser -> Router : request
Router -> Controller : dispatch
Controller -> Model : query
Model -> DB : SQL
DB -> Model : rows
Model -> Controller : data
Controller -> View : render
View -> Browser : HTML
`,
  },
  {
    id: 'event-driven',
    name: 'Event-driven',
    description: 'A producer fanning events out to independent consumers',
    icon: '⚡',
    code: `direction LR

Producer [service] "Order Service"
Broker [queue] "Kafka"

group Consumers {
  Inventory [service] "Inventory Worker"
  Email [service] "Email Worker"
  Analytics [service] "Analytics Worker"
}

Warehouse [database] "Warehouse"

Producer --> Broker : OrderPlaced
Broker --> Inventory : consume
Broker --> Email : consume
Broker --> Analytics : consume
Inventory -> Warehouse : update stock
`,
  },
  {
    id: 'client-server',
    name: 'Client–Server',
    description: 'Load-balanced app servers sharing a cache and database',
    icon: '🖥️',
    code: `direction LR

Client [external] "Browser"
LB [service] "Load Balancer"

group "App Tier" {
  App1 [service] "App Server 1"
  App2 [service] "App Server 2"
}

Cache [cache] "Redis"
DB [database] "PostgreSQL"

Client <-> LB : HTTPS
LB -> App1 : proxy
LB -> App2 : proxy
App1 -> Cache : session
App2 -> Cache : session
App1 -> DB : SQL
App2 -> DB : SQL
`,
  },
];
