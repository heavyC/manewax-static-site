---
name: ecommerce-definition
description: 'Define comprehensive ecommerce website requirements. Use for business planning, feature specification, UI/UX design, and technical architecture planning for Manewax-style ecommerce projects.'
argument-hint: 'Business name, target market, key features'
---

# Ecommerce Website Definition

## When to Use
- Starting a new ecommerce project
- Planning website features and architecture  
- Defining business requirements and user flows
- Specifying UI/UX design requirements
- Creating technical implementation roadmap

## Comprehensive Definition Workflow

### Phase 1: Business Requirements Discovery

#### 1.1 Business Overview
- **Business name and brand positioning**
- **Products/services** Hand made wax for horse health, beauty and grooming.
- **Target audience** Horse riders, owners and groomers. Equine enthusiasts and barn owners.
- **Business model** B2C
- **Geographic scope** United States only
<!-- - **Revenue goals** and growth projections -->

<!-- #### 1.2 Competitive Analysis  
- **Direct competitors** and their key features
- **Differentiators** that set your business apart
- **Pricing strategy** relative to market
- **Feature gaps** in existing solutions -->

#### 1.3 Business Rules & Constraints
- **Inventory management** requirements
- **Shipping and fulfillment** processes  
- **Payment methods** and processing
- **Tax calculation** requirements
- **Legal compliance** (GDPR, accessibility, etc.)
- **Integration needs** (CRM, ERP, accounting)

### Phase 2: Feature Definition & Prioritization

#### 2.1 Core Ecommerce Features
**Essential (MVP):**
- [x] Product catalog with categories
- [x] Shopping cart and checkout
- [ ] User registration and login
- [ ] Order management  
- [ ] Basic inventory tracking
- [x] Payment processing - integrate with Stripe
- [ ] Order confirmation emails

**Important (Phase 2):**
<!-- - [ ] Product reviews and ratings -->
<!-- - [ ] Wishlist/favorites -->
- [ ] Customer account dashboard
- [ ] Order tracking and history
<!-- - [ ] Advanced search and filtering -->
- [x] Promotional codes and discounts
<!-- - [ ] Multi-variant products (size, color) -->

**Nice-to-have (Future):**
- [ ] Recommendation engine  
<!-- - [ ] Live chat support -->
- [ ] Subscription/recurring orders
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Social media integration

#### 2.2 Admin Dashboard Features
- [x] Product management (CRUD, bulk operations)
- [x] Order management and fulfillment
- [x] Customer management
- [x] Inventory management
- [x] Sales reporting and analytics
- [ ] Content management
- [ ] Settings and configuration

#### 2.3 Technical Requirements
- [ ] **Database**: Neon PostgreSQL + Drizzle ORM
- [ ] **Authentication**: Clerk integration
- [ ] **UI Components**: shadcn/ui consistency  
- [ ] **Framework**: Next.js App Router
- [ ] **Performance**: Image optimization, caching
- [ ] **SEO**: Meta tags, structured data, sitemaps
- [ ] **Security**: Input validation, HTTPS, PCI compliance

### Phase 3: UI/UX Specifications

#### 3.1 User Experience Flow
**Customer Journey:**
1. **Discovery** → Browse/search products
2. **Evaluation** → View product details, reviews  
3. **Decision** → Add to cart, compare options
4. **Purchase** → Checkout process
5. **Fulfillment** → Order tracking, delivery
6. **Support** → Returns, customer service

**Key User Flows:**
- [ ] Product discovery and browsing
- [ ] Product search and filtering  
- [ ] Add to cart and checkout
- [ ] User registration and login
- [ ] Account management and order history
- [ ] Mobile shopping experience

#### 3.2 Page Structure & Layout
**Frontend Pages:**
- [ ] **Homepage**: Hero, featured products, categories
- [ ] **Product Listing**: Grid/list view, filters, sorting
- [ ] **Product Detail**: Images, description, variants, reviews  
- [ ] **Shopping Cart**: Items, quantities, totals
- [ ] **Checkout**: Shipping, payment, confirmation
- [ ] **User Account**: Profile, orders, addresses, preferences
- [ ] **Static Pages**: About, contact, policies, FAQ

**Admin Dashboard:**
- [ ] **Dashboard**: Key metrics, recent activity
- [ ] **Products**: Listing, create/edit, inventory
- [ ] **Orders**: Order management, fulfillment
- [ ] **Customers**: User management, communication
- [ ] **Reports**: Sales, products, customer analytics

#### 3.3 Design System Requirements  
- [ ] **Brand colors** and typography
- [ ] **Component library** (using shadcn/ui)
- [ ] **Responsive breakpoints** (mobile-first)
- [ ] **Loading states** and error handling
- [ ] **Accessibility standards** (WCAG compliance)  
- [ ] **Dark mode** support (optional)

### Phase 4: Technical Architecture

#### 4.1 Database Schema Planning
Using the [database schema reference](../../docs/database-schema.md):
- [ ] **Users** (Clerk integration)
- [ ] **Products** and product variants  
- [ ] **Categories** and product organization
- [ ] **Orders** and order items
- [ ] **Shopping Cart** (persistent and guest)
- [ ] **Customer Addresses**
- [ ] **Reviews and Ratings**
- [ ] **Inventory Management**

#### 4.2 API Design
- [ ] **Product APIs**: CRUD, search, filtering
- [ ] **Cart APIs**: Add, update, remove items
- [ ] **Order APIs**: Create, update, track orders
- [ ] **User APIs**: Profile, preferences, addresses
- [ ] **Admin APIs**: Management functions
- [ ] **Integration APIs**: Payment, shipping, etc.

#### 4.3 Performance & Scalability  
- [ ] **Image optimization** (Next.js Image component)
- [ ] **Database indexing** for search performance
- [ ] **Caching strategy** (Redis, CDN)
- [ ] **SEO optimization** (meta tags, structured data)
- [ ] **Mobile performance** optimization

### Phase 5: Implementation Planning

#### 5.1 Development Phases

**Phase 1 (MVP - 4-6 weeks):**
- Basic product catalog
- Shopping cart and checkout  
- User authentication (Clerk)
- Order management
- Payment processing integration
- Responsive design foundation

**Phase 2 (Enhanced - 3-4 weeks):**
- Product reviews and ratings
- Advanced search and filtering  
- Customer account features
- Admin dashboard
- Email notifications
- SEO optimization

**Phase 3 (Advanced - 4-6 weeks):**
- Advanced inventory management
- Promotional features
- Analytics and reporting
- Performance optimization
- Additional integrations

#### 5.2 Success Metrics
- [ ] **Performance**: Page load times < 3 seconds
- [ ] **Conversion**: Cart abandonment < 70%
- [ ] **User Experience**: Mobile-friendly, accessible
- [ ] **Business**: Order processing, inventory accuracy  
- [ ] **Technical**: 99% uptime, secure transactions

## Outputs Generated

After completing this workflow, you'll have:
1. **Business Requirements Document**: Complete feature specifications
2. **Technical Architecture Plan**: Database schema, API design
3. **UI/UX Wireframes**: Page layouts and user flows  
4. **Development Roadmap**: Phased implementation plan
5. **Success Criteria**: Measurable goals and KPIs

## Next Steps

1. **Review and validate** requirements with stakeholders
2. **Set up development environment** (Neon DB, Clerk auth)
3. **Create project structure** following Manewax patterns
4. **Begin Phase 1 implementation** with MVP features