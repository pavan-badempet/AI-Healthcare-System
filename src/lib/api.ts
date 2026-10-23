/**
 * AI Healthcare System — Unified Client API Barrel
 * Re-exports all core, auth, hospital, prediction, lakehouse, billing, admin, and clinical intelligence endpoints.
 */

// Core
export * from './apiCore';

// Authentication & Users
export * from './apiAuth';

// Clinical & AI Chat
export * from './apiChat';

// TabICLv2 Predictive Models & Risk Quantification
export * from './apiPredictions';

// Hospital Operations, Bed Management & Care Events
export * from './apiHospital';

// System Administration, Governance, Audit & Agent Mesh
export * from './apiAdmin';

// Billing, Claims & Revenue Cycle Management
export * from './apiBilling';

// Databricks Delta Lakehouse & OMOP CDM Data Platform
export * from './apiLakehouse';

// Federated Learning & Edge AI
export * from './apiFederated';

// Frontier Clinical Intelligence (BioTwin, Causal Inference, Delphi)
export * from './apiIntelligence';

// SMART on FHIR & Interoperability
export * from './apiSmart';

// Central Error Handling
export * from './apiErrors';
