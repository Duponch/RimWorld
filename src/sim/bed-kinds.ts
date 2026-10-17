/** Beds share roles, reservations and physical sleep services. */
export const isBedKind=(value:unknown):value is 'bedroll'|'bed'|'hospital-bed'|'double-bed'|'sleeping-spot'=>value==='sleeping-spot'||value==='bedroll'||value==='bed'||value==='hospital-bed'||value==='double-bed';
