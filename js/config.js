// Website configuration
// All values in this file are visible to anyone who views the site

const config = {
  bookingLink: "https://calendly.com/akkshhanshwasnik-veloup/free-call",
  whatsappNumber: "+918669614407",
  businessEmail: "hello@veloup.in",
  formEndpoint: "[APPS SCRIPT WEB APP ADDRESS]",
  whatsappMessage: "Hi, I'd like to know more about VeloUp"
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
} else {
  // Browser environment
  window.config = config;
}