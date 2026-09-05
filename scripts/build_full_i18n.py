# scripts/build_full_i18n.py
import json, os

LANGUAGES = [
    {"code": "en", "label": "English", "nativeLabel": "English", "locale": "en-RW", "flag": "🇬🇧"},
    {"code": "rw", "label": "Kinyarwanda", "nativeLabel": "Kinyarwanda", "locale": "rw-RW", "flag": "🇷🇼"},
    {"code": "fr", "label": "French", "nativeLabel": "Français", "locale": "fr-RW", "flag": "🇫🇷"},
    {"code": "sw", "label": "Swahili", "nativeLabel": "Kiswahili", "locale": "sw-KE", "flag": "🇰🇪"},
    {"code": "ko", "label": "Korean", "nativeLabel": "한국어", "locale": "ko-KR", "flag": "🇰🇷"},
    {"code": "zh", "label": "Chinese", "nativeLabel": "中文", "locale": "zh-CN", "flag": "🇨🇳"},
]

DICT_EN = {
    "common": {
        "home": "Home", "cars": "Cars", "saved": "Saved", "messages": "Messages", "account": "Account",
        "back": "Back", "close": "Close", "cancel": "Cancel", "save": "Save", "search": "Search",
        "signIn": "Sign in", "register": "Register", "logout": "Log out", "next": "Next",
        "skip": "Skip", "getStarted": "Get started", "loading": "Loading…", "retry": "Try again",
        "language": "Language", "done": "Done", "settings": "Settings", "buy": "Buy",
        "rent": "Rent", "sell": "Sell", "profile": "Profile", "menu": "Menu",
        "share": "Share", "delete": "Delete", "edit": "Edit", "filter": "Filter", "filters": "Filters",
        "sort": "Sort", "all": "All", "yes": "Yes", "no": "No", "optional": "Optional",
        "required": "Required", "viewAll": "View all", "seeMore": "See more", "viewDetails": "View details",
        "contactSeller": "Contact Seller", "call": "Call", "whatsapp": "WhatsApp", "phone": "Phone",
        "email": "Email", "chat": "Chat", "verified": "Verified", "pending": "Pending",
        "active": "Active", "approved": "Approved", "rejected": "Rejected", "sold": "Sold",
        "closed": "Closed", "status": "Status", "error": "Error", "success": "Success",
        "rra": "Rwanda Revenue Authority", "rwf": "RWF", "usd": "USD",
        "perDay": "/day", "perMonth": "/month", "perYear": "/year", "km": "km",
        "compare": "Compare", "confirm": "Confirm", "submit": "Submit"
    },
    "language": {
        "title": "Choose your language",
        "subtitle": "You can change this any time in Settings.",
        "current": "Current language",
        "saved": "Language updated",
        "restartHint": "Your choice is saved on this device and applies immediately."
    },
    "welcome": {
        "title": "Rwanda's most\ntrusted car\nmarketplace.",
        "subtitle": "Quality cars. Fair prices.\nTotal peace of mind.",
        "trusted": "Trusted", "trustedSub": "Every car is\ninspected",
        "fairPrices": "Fair prices", "fairPricesSub": "Best value for\nyour money",
        "directContact": "Direct contact", "directContactSub": "Deal with the\nseller yourself",
        "exploreCars": "Explore cars", "sellCar": "Sell your car",
        "alreadyAccount": "Already have an account?",
        "termsPrefix": "By continuing, you agree to our", "terms": "Terms", "privacy": "Privacy policy"
    },
    "onboarding": {
        "inspectTitle": "Every car, inspected", "inspectSub": "150-point certified check.",
        "photosTitle": "Real photos, real specs", "photosSub": "Shot by our own team.",
        "trustTitle": "Contact verified sellers", "trustSub": "Agree and transact directly.",
        "updateChoice": "Keep Sawa Cars up to date automatically. New versions install when you next open the app — never while you are using it."
    },
    "drawer": {
        "buyCar": "Buy a car", "browseAll": "Browse all cars", "savedCars": "Saved cars", "compareCars": "Compare cars",
        "rent": "Rent", "browseRentals": "Browse rentals", "rentalInquiries": "Rental inquiries",
        "financeServices": "Finance & services", "financing": "Financing calculator", "importDuty": "Import duty", "imports": "My vehicle imports",
        "sellCar": "Sell a car", "verifyIdentity": "Identity verification", "submitCar": "Submit my car", "submissions": "My submissions", "analytics": "Seller analytics", "trustScore": "My trust score",
        "trustSafety": "Trust & safety", "notifications": "Notifications", "marketplaceSafety": "Marketplace safety",
        "teamPortal": "Team portal", "version": "Sawa Cars v1.0 · Kigali, Rwanda", "certifiedMarketplace": "Rwanda's certified marketplace"
    },
    "settings": {
        "title": "Settings", "account": "Account", "preferences": "Preferences", "support": "Support", "app": "App", "legal": "Legal", "danger": "Danger zone",
        "verification": "Verification & trust", "savedSearches": "Saved searches", "push": "Push notifications",
        "language": "Language", "checkUpdates": "Check for updates", "whatsapp": "WhatsApp us", "call": "Call us", "email": "Email us", "replay": "Replay intro",
        "privacy": "Privacy policy", "terms": "Terms of service", "directDeal": "Direct-deal notice", "delete": "Delete my account", "deleteHint": "Permanent. Your data is erased.",
        "verified": "Verified", "underReview": "Under review", "actionNeeded": "Action needed", "notVerified": "Not verified",
        "closeAccount": "Close my account", "closeHint": "Takes effect straight away. Erased for good after {{days}} days.",
        "closeWhy": "Why are you closing your account? It genuinely changes what we fix next.", "closeNote": "Anything else? (optional)",
        "password": "Your password", "autoUpdate": "Install updates automatically",
        "autoUpdateOn": "New versions will install the next time you open the app.", "autoUpdateOff": "You will be asked before a new version is installed.",
        "pushError": "Push could not be enabled. Check notification permissions in your phone settings.",
        "wrongPassword": "That password is not correct.", "networkError": "We couldn't reach Sawa Cars. Check your connection and try again.", "genericError": "Something went wrong. Please try again."
    },
    "home": {
        "location": "Location", "kigali": "Kigali, Rwanda", "buy": "Buy", "rent": "Rent",
        "offlineTitle": "We couldn't reach Sawa Cars", "offlineSub": "Check your connection to see the latest listings.",
        "search": "Search make, model, type…", "searchRentals": "Search rental cars…", "rentalInquiry": "Rental inquiry in progress",
        "certifiedRentals": "Certified rentals", "certifiedRentalsSub": "Reliable vehicles for every journey.",
        "topDeals": "Top deals", "topDealsSub": "Chosen by our team · swipe for more",
        "certifyCar": "Certify my car", "importDuty": "Import duty", "financing": "Financing", "compare": "Compare",
        "showroom": "Sawa Center", "onDisplay": "On display in Nyarutarama this week", "carsInShowroom": "{{count}} cars in the showroom",
        "all": "All", "imported": "Imported", "local": "Local", "evHybrid": "EV·Hybrid",
        "fresh": "Fresh this week", "popular": "Popular near you", "browseAll": "Browse all cars",
        "ourPromise": "Our promise", "aboutUs": "About us", "login": "Log in", "copyright": "© 2026 Sawa Cars. All rights reserved.",
        "trying": "Trying…", "safariReady": "Safari-ready", "suv": "SUV", "sedan": "Sedan", "truck": "Truck",
        "safari4x4s": "Safari-ready 4×4s", "availableKigali": "Available in Kigali",
        "showrooms": "Showrooms", "showroomCarsView": "{{count}} cars · view the collection",
        "recentlyViewed": "Recently viewed", "moreLikeSaved": "More like your saved cars", "saved": "Saved", "more": "More",
        "bannerCertifiedBrand": "Sawa Certified", "bannerCertifiedTagline": "Every car inspected before listing. No exceptions.", "bannerCertifiedTag": "Trust",
        "bannerInspectionBrand": "150-Point Check", "bannerInspectionTagline": "Certified mechanics. Full report before you buy.", "bannerInspectionTag": "Inspection",
        "bannerSellBrand": "Certify Your Car", "bannerSellTagline": "Submit for our 150-point inspection. We list it for you.", "bannerSellTag": "Sell",
        "providerContacted": "provider contacted", "awaitingProvider": "awaiting provider reply", "inspected": "{{score}}/150 inspected", "perDay": "/day", "seats": "seats", "trips": "trips", "belowMarket": "{{percent}}% below market", "highDemand": "High demand", "saveCar": "Save {{title}}", "removeSaved": "Remove {{title}} from saved",
        "carsCount": "{{label}} · {{count}} cars", "unavailableUntil": "Unavailable until {{date}}"
    },
    "filters": {
        "filters": "Filters", "clear": "Clear all filters", "apply": "View cars", "noResults": "No cars found", "adjust": "Try adjusting your search or removing filters",
        "price": "Price", "anyPrice": "Any price", "underPrice": "Under RWF {{amount}}", "minimumPrice": "Minimum price", "noMinimum": "No minimum", "minPrice": "RWF {{amount}}M+",
        "year": "Year", "anyYear": "Any year", "newer": "{{year}} or newer", "mileage": "Mileage", "anyMileage": "Any mileage", "underMileage": "Under {{mileage}} km",
        "inspectionScore": "Inspection score", "anyScore": "Any score", "scorePlus": "{{score}}+ / 150", "make": "Make", "location": "Location", "bodyType": "Body type", "fuelType": "Fuel type", "transmission": "Transmission",
        "standardNote": "Public listings pass the configured seller, inspection and image publication checks. Inspection evidence is not a transaction warranty.", "reset": "Reset", "viewCount": "View {{count}} cars"
    },
    "searchResults": {
        "back": "Go back", "clearSearch": "Clear search", "filterButton": "Filters", "carsFound": "{{count}} cars found", "rentalsFound": "{{count}} rentals found", "plusCars": "{{count}}+ cars",
        "saveSearch": "Save search", "savedToast": "Search saved — we'll notify you when new matching cars are listed.", "allCars": "All cars", "everyMatch": "That's every match on Sawa Cars right now.",
        "bestMatch": "Best match", "priceLow": "Price ↑", "priceHigh": "Price ↓", "newest": "Newest", "mileage": "Mileage", "showList": "Show results as a list", "showGrid": "Show results as a grid"
    },
    "auth": {
        "signInTitle": "Welcome back", "signInSub": "Sign in to continue to Sawa Cars.", "createTitle": "Create account", "createSub": "Buy, save and message sellers on Sawa Cars.",
        "email": "Email", "validEmail": "Please enter a valid email address.", "password": "Password", "passwordMin": "Password must be at least 6 characters.",
        "forgot": "Forgot?", "enterPassword": "Enter your password", "hidePassword": "Hide password", "showPassword": "Show password", "signIn": "Sign in",
        "noAccount": "Don't have an account?", "signUp": "Sign up", "fullName": "Full name", "namePlaceholder": "Alex Morgan", "nameRequired": "Please enter your full name.",
        "passwordPlaceholder": "At least 6 characters", "createAccount": "Create account", "termsPrefix": "By creating an account you agree to our", "terms": "Terms", "privacy": "Privacy Policy",
        "alreadyAccount": "Already have an account?", "accountClosed": "This account is closed", "accountClosedMessage": "You closed it, and nothing has been erased. Reopen it and your saved cars, messages and listings come back.",
        "accountClosedUntil": "After {{date}} it is deleted for good.", "reopen": "Reopen my account", "notNow": "Not now", "welcomeBack": "Welcome back. Your account is open again.",
        "reopenError": "Could not reopen this account.", "invalidCredentials": "Invalid email or password.", "createError": "Could not create your account. Please try again."
    },
    "vehicleDetail": {
        "overview": "Overview", "specifications": "Specifications", "features": "Key Features", "keyDetails": "Vehicle Details",
        "make": "Make", "model": "Model", "year": "Year", "mileage": "Mileage", "transmission": "Transmission",
        "fuel": "Fuel Type", "bodyType": "Body Type", "driveSide": "Drive Side", "doors": "Doors", "seats": "Seats",
        "color": "Color", "vin": "VIN / Chassis", "plate": "Plate Number", "inspectionScore": "Inspection Score",
        "location": "Location", "seller": "Seller", "verifiedSeller": "Verified Seller",
        "inspectionReport": "150-Point Inspection Report", "reportSub": "Certified mechanical & safety inspection", "viewReport": "View Full Report", "passedPoints": "150/150 Passed",
        "vehicleHistory": "Vehicle History & RRA Records", "historySub": "Ownership, registration & tax clearance", "viewHistory": "View Vehicle History", "cleanTitle": "Clean Title · Tax Cleared",
        "financeEst": "Financing & Payment Calculator", "monthlyEstimate": "Estimated Monthly Payment", "financeSub": "From ~{{amount}}/mo with bank partner financing", "calculateLoan": "Calculate Loan Terms",
        "directDealNotice": "Direct Buyer-to-Seller Deal", "directDealBody": "Sawa Cars does not hold funds or charge transaction fees. You negotiate and transact directly with the seller in person.",
        "chatWhatsApp": "Chat on WhatsApp", "callSeller": "Call Seller", "inAppChat": "In-App Message",
        "shareCar": "Share Vehicle", "shareMessage": "Check out this {{year}} {{title}} on Sawa Cars: {{price}}",
        "similarCars": "Similar Vehicles", "saveCar": "Save to Favorites", "savedCar": "Saved to Favorites",
        "unavailable": "This vehicle is no longer available", "unavailableSub": "It may have been sold or reserved by another buyer.",
        "browseCars": "Browse Available Cars", "loadingCar": "Loading vehicle details…", "priceDrop": "Price Drop", "belowMarket": "{{amount}} below market"
    },
    "inspection": {
        "title": "150-Point Inspection Report", "subtitle": "Conducted by Certified Automotive Engineers in Kigali",
        "passedOf": "{{score}} of 150 items passed", "scoreGrade": "Sawa Certified Quality", "certifiedBadge": "Certified",
        "mechanicNotes": "Inspector Notes & Summary", "zoneMap": "Vehicle Zone Map", "zoneMapSub": "Exterior condition visual mapping",
        "categories": {
            "engine": "Engine & Transmission",
            "suspension": "Suspension & Steering",
            "brakes": "Brakes, Wheels & Tyres",
            "electrical": "Electrical & Diagnostics",
            "body": "Bodywork & Structural Integrity",
            "interior": "Interior & Safety Equipment",
            "docs": "Documentation & Legal Title"
        },
        "statusPassed": "Passed", "statusAttention": "Attention", "statusFailed": "Issue Found",
        "fullChecklist": "Complete 150-Point Checklist", "passedAll": "All items inspected & verified",
        "flagsPresent": "Items requiring attention noted below", "scheduleInspection": "Book Inspection", "inspectionCenter": "Inspection Center"
    },
    "vehicleHistory": {
        "title": "Vehicle History Report", "subtitle": "Official records from Rwanda Revenue Authority (RRA) & Interpol",
        "rraVerified": "RRA Title Verified", "registrationDate": "First Registered in Rwanda",
        "ownershipHistory": "Ownership Records", "previousOwners": "Previous Owners in Rwanda",
        "importStatus": "Import & Customs Duty", "originCountry": "Country of Origin", "taxCleared": "Customs Duty Cleared",
        "stolenCheck": "Interpol & Police Database Check", "cleanStolen": "No theft or police flags reported",
        "insuranceStatus": "Insurance & Inspection Status", "validInspection": "Valid Technical Control Certificate",
        "chassisVerified": "Chassis & Engine Numbers Match RRA Record", "officialRecordsNote": "All data sourced directly from official registry verification."
    },
    "profile": {
        "guestTitle": "You're browsing as a guest", "guestSub": "Sign in to save cars, message sellers, and list your vehicle.",
        "signInBtn": "Sign In", "continueDemo": "Continue with demo account",
        "accountTitle": "My Account", "sellerSection": "Seller Tools", "accountSection": "Account & Services",
        "identityVerification": "Identity Verification", "contactVisibility": "Contact Visibility",
        "mySubmissions": "My Vehicle Submissions", "carValuation": "What's My Car Worth?",
        "rentalInquiries": "Rental Inquiries", "myImports": "My Vehicle Imports",
        "messages": "Messages & Inquiries", "marketplaceSafety": "Marketplace Safety & Promise",
        "howBuyingWorks": "How Buying Works", "settings": "Settings", "helpSupport": "Help & Support",
        "trustScoreTitle": "My Trust Score", "trustScoreSub": "Higher trust scores give buyers confidence.",
        "points": "points", "idPoints": "ID Verification", "salesPoints": "Completed Sales", "responsePoints": "Response Speed", "reviewPoints": "Buyer Reviews",
        "logoutConfirm": "Are you sure you want to log out?", "logoutBtn": "Log Out"
    },
    "saved": {
        "title": "Saved Cars", "subtitle": "Keep track of vehicles you love",
        "emptyTitle": "No saved cars yet", "emptySub": "Tap the heart icon on any vehicle listing to save it here for quick access.",
        "browseCars": "Browse Cars", "compareSelected": "Compare Selected ({{count}})", "searchAlerts": "Search Alerts",
        "savedCount": "{{count}} saved vehicles", "removeSaved": "Remove from saved"
    },
    "messages": {
        "title": "Messages", "emptyTitle": "No messages yet", "emptySub": "Reach out to sellers directly from any car listing to start a conversation.",
        "browseCars": "Browse Cars", "today": "Today", "yesterday": "Yesterday",
        "typeMessage": "Type a message…", "send": "Send", "pinnedListing": "Pinned Vehicle",
        "viewCar": "View Listing", "directNotice": "Communicate safely. Never send advance money online."
    },
    "tools": {
        "dutyTitle": "Rwanda RRA Import Duty Calculator", "dutySub": "Calculate estimated customs duty, excise, VAT and taxes for imported vehicles.",
        "vehicleValue": "Vehicle CIF / Purchase Value (RWF)", "valuePlaceholder": "e.g. 15,000,000",
        "ageLabel": "Vehicle Age (Years)", "engineCc": "Engine Displacement (cc)", "fuelLabel": "Fuel & Powertrain",
        "dutyBreakdown": "Tax & Duty Breakdown", "cifValue": "CIF Value", "customsDuty": "Customs Duty (25%)",
        "exciseDuty": "Excise Duty (5%–30%)", "vat": "VAT (18%)", "withholdingTax": "Withholding Tax (5%)",
        "infraLevy": "Infrastructure Levy (1.5%)", "totalDuties": "Total Duties & Taxes", "landedPrice": "Estimated Landed Cost in Kigali",
        "calculateBtn": "Calculate Import Taxes", "ratesNotice": "Estimates based on East African Community (EAC) Common External Tariff regulations.",
        "financeTitle": "Car Loan & Financing Calculator", "financeSub": "Estimate your monthly loan installments with partner commercial banks.",
        "carPrice": "Vehicle Price (RWF)", "downPayment": "Down Payment", "loanTerm": "Loan Term", "interestRate": "Annual Interest Rate (%)",
        "monthlyPayment": "Estimated Monthly Installment", "totalInterest": "Total Interest Payable", "totalLoan": "Total Repayment Amount",
        "amortizationTable": "Repayment Schedule", "disclaimer": "Financing rates subject to bank credit approval.",
        "valuationTitle": "Free Vehicle Valuation Tool", "valuationSub": "Get a data-backed market valuation based on recent certified sales in Rwanda.",
        "selectMake": "Select Make", "selectModel": "Select Model", "selectYear": "Select Year", "selectMileage": "Select Mileage",
        "estimateBtn": "Estimate Market Value", "estimatedRange": "Estimated Market Value", "comparablesSeen": "Based on {{count}} certified comparable sales", "valuationNote": "Actual price varies by mechanical condition and 150-point inspection grade."
    },
    "sell": {
        "title": "Sell Your Car Without The Hassle", "subtitle": "We inspect, photograph, and certify your car. You keep 100% of the sale price.",
        "step1Title": "1. Submit Details", "step1Sub": "Tell us about your vehicle in 2 minutes.",
        "step2Title": "2. 150-Point Inspection", "step2Sub": "Bring your car to our center for a certified quality report.",
        "step3Title": "3. Professional Photos", "step3Sub": "We shoot studio-quality 36-angle photos for you.",
        "step4Title": "4. Verified Buyers Connect", "step4Sub": "Serious buyers contact you directly on WhatsApp or phone.",
        "submitMyCar": "Submit My Car", "freeValuation": "Free Instant Valuation", "weInspectShoot": "We Inspect & Shoot For You", "instantEstimate": "Get Market Price"
    },
    "submission": {
        "formTitle": "Vehicle Submission", "basicInfo": "1. Vehicle Details", "pricingMileage": "2. Price & Mileage",
        "featuresCondition": "3. Features & Condition", "inspectionCenter": "4. Choose Inspection Center",
        "selectCenter": "Select Center in Kigali", "pricePlaceholder": "Price in RWF (e.g. 28,000,000)", "mileagePlaceholder": "Mileage in km (e.g. 45,000)",
        "descPlaceholder": "Describe vehicle maintenance history, condition, and special features…",
        "submitBtn": "Submit for Inspection", "submitting": "Submitting vehicle…",
        "submissionSuccess": "Submission Received!", "successSub": "Our team will review your submission and contact you to confirm your inspection slot."
    },
    "idVerification": {
        "title": "Identity Verification", "subtitle": "Verified sellers get 3x more buyer inquiries and a Certified Seller badge.",
        "docType": "Document Type", "nationalId": "Rwanda National ID", "passport": "Passport",
        "uploadFront": "Upload Document Front", "uploadBack": "Upload Document Back",
        "submitVerification": "Submit for Verification", "pendingReview": "Verification Under Review",
        "approvedStatus": "Identity Verified ✓", "rejectedStatus": "Verification Action Needed",
        "privacyNotice": "Your documents are securely encrypted and never shared publicly."
    },
    "contactSettings": {
        "title": "Contact Visibility", "subtitle": "Control how verified buyers can reach you about your listings.",
        "phoneVisibility": "Allow Phone Calls", "phoneSub": "Show your phone number to signed-in buyers.",
        "whatsappVisibility": "Allow WhatsApp Messages", "whatsappSub": "Enable direct WhatsApp chat button on your car listings.",
        "consentNotice": "Your contact details are only visible to authenticated buyers who agree to direct transaction terms.",
        "saveSettings": "Save Visibility Preferences", "savedSuccess": "Preferences updated successfully."
    },
    "rentals": {
        "fleetTitle": "Certified Car Rentals in Kigali", "fleetSub": "Documented vehicle condition with verified rental providers.",
        "requestDates": "Select Rental Dates", "pickupLocation": "Pickup & Return Location",
        "minDays": "Minimum rental: {{count}} days", "securityDeposit": "Refundable Security Deposit", "depositNote": "Paid directly to provider at vehicle pickup.",
        "providerConfirms": "Provider confirms vehicle availability and written rental terms directly with you.",
        "submitInquiry": "Send Availability Inquiry", "inquirySuccess": "Inquiry Sent!", "myInquiriesTitle": "My Rental Inquiries", "noInquiries": "No rental inquiries found.",
        "notFoundTitle": "This rental isn't available", "notFoundSub": "It may have been paused or removed from the fleet.",
        "goBack": "Go back", "loading": "Loading this rental…", "forRent": "For rent", "certified": "Certified {{score}}/150",
        "safariReady": "Safari-ready", "share": "Share", "shareMessage": "{{title}} — {{price}}/day on Sawa Cars",
        "seats": "seats", "gearbox": "Gearbox", "fuel": "Fuel", "year": "Year",
        "unavailableUntil": "Unavailable until {{date}}", "availability": "Availability",
        "availabilityNote": "A verified provider will confirm vehicle, price and pickup arrangements. Sending an inquiry does not hold or book the car.",
        "pricing": "Pricing", "dailyRate": "Daily rate", "weeklyRate": "Weekly rate", "saveVsDaily": "Save {{amount}} vs daily",
        "depositSub": "Provider-stated amount · confirm written terms", "confirmTerms": "Confirm these terms with the provider",
        "insurance": "Insurance coverage", "roadside": "Roadside assistance", "mileageLimits": "Kilometre limits",
        "depositTerms": "Deposit & refund terms", "safetyLink": "Marketplace safety & responsibilities",
        "inspectionTitle": "150-Point Inspection Report", "inspectionSub": "Scored {{score}}/150 · View full report",
        "howItWorks": "How renting works",
        "step1Title": "Send an inquiry", "step1Desc": "Share your dates and preferred contact channel.",
        "step2Title": "Agree directly", "step2Desc": "The provider confirms availability, price, insurance, deposit and written rental terms.",
        "step3Title": "Manage the rental", "step3Desc": "Pickup, payment, vehicle condition and return are handled directly between you and the provider.",
        "ctaDailyRental": "Daily rental", "ctaPerDay": "/ day", "ctaRateNote": "Provider-stated rate · confirm directly",
        "ctaInquiryOnly": "Inquiry only", "ctaRequestAvailability": "Request availability"
    },
    "buyingGuide": {
        "title": "How Buying Works on Sawa Cars", "subtitle": "5 simple steps to safely buying a certified car in Rwanda.",
        "step1": "1. Browse Certified Listings with 150-Point Reports",
        "step2": "2. Verify Title, VIN, and RRA Tax Clearance Online",
        "step3": "3. Contact Seller Directly on WhatsApp or Call",
        "step4": "4. Meet at Sawa Center for Physical Test Drive",
        "step5": "5. Settle Payment Directly & Complete RRA Title Transfer",
        "checklistTitle": "Buyer Safety Checklist", "safetyTips": "Never pay advance booking fees. Always inspect in person in daylight."
    },
    "sawaPromise": {
        "title": "The Sawa Cars Marketplace Promise", "subtitle": "Independent verification. Zero hidden fees. Direct transactions.",
        "whatWeControl": "What Sawa Cars Guarantees", "whatUsersControl": "What Buyers & Sellers Control Directly",
        "zeroFees": "Zero Buyer Commission", "transparentInspections": "100% Unbiased 150-Point Reports"
    },
    "comparison": {
        "title": "Vehicle Comparison", "emptyTitle": "No vehicles to compare", "emptySub": "Select 2 or more cars while browsing to compare specs side by side.",
        "addCar": "Add Vehicle", "specDiff": "Highlight Differences", "clearComparison": "Clear Comparison"
    }
}

DICT_RW = {
    "common": {
        "home": "Ahabanza", "cars": "Imodoka", "saved": "Zabitswe", "messages": "Ubutumwa", "account": "Konti",
        "back": "Subira inyuma", "close": "Funga", "cancel": "Hagarika", "save": "Bika", "search": "Shakisha",
        "signIn": "Injira", "register": "Iyandikishe", "logout": "Sohoka", "next": "Komeza",
        "skip": "Simbuka", "getStarted": "Tangira", "loading": "Birimo gutegurwa…", "retry": "Ongera ugerageze",
        "language": "Ururimi", "done": "Byarangiye", "settings": "Igenamiterere", "buy": "Gura",
        "rent": "Kodesha", "sell": "Gurisha", "profile": "Umwirondoro", "menu": "Menyu",
        "share": "Sangiza", "delete": "Siba", "edit": "Hindura", "filter": "Yungurura", "filters": "Akayunguruzo",
        "sort": "Tondeka", "all": "Zose", "yes": "Yego", "no": "Oya", "optional": "Si ngombwa",
        "required": "Birakenewe", "viewAll": "Reba zose", "seeMore": "Reba ibindi", "viewDetails": "Reba birambuye",
        "contactSeller": "Vugana n'Umugurisha", "call": "Duhamagare", "whatsapp": "WhatsApp", "phone": "Telefoni",
        "email": "Imeyili", "chat": "Kuganira", "verified": "Byagenzuwe", "pending": "Birategereje",
        "active": "Bikora", "approved": "Byemejwe", "rejected": "Byanzwe", "sold": "Yagurishijwe",
        "closed": "Byafunzwe", "status": "Imimerere", "error": "Ikosa", "success": "Byakunze",
        "rra": "Ikigo cy'Imisoro n'Amahoro (RRA)", "rwf": "RWF", "usd": "USD",
        "perDay": "/umunsi", "perMonth": "/ukwezi", "perYear": "/umwaka", "km": "km",
        "compare": "Geranya", "confirm": "Emeza", "submit": "Tanga"
    },
    "language": {
        "title": "Hitamo ururimi",
        "subtitle": "Ushobora kubihindura igihe icyo ari cyo cyose muri Igenamiterere.",
        "current": "Ururimi rukoreshwa",
        "saved": "Ururimi rwahinduwe",
        "restartHint": "Ihitamo ryawe ribikwa kuri iki gikoresho kandi rihita rikora."
    },
    "welcome": {
        "title": "Isoko ry’imodoka\nryizewe cyane\nmu Rwanda.",
        "subtitle": "Imodoka nziza. Ibiciro biboneye.\nAmahoro yuzuye.",
        "trusted": "Yizewe", "trustedSub": "Buri modoka\nirasuzumwa",
        "fairPrices": "Ibiciro biboneye", "fairPricesSub": "Agaciro keza ku\nmafaranga yawe",
        "directContact": "Kuvugana mu buryo butaziguye", "directContactSub": "Ganira n’umugurisha\nubwawe",
        "exploreCars": "Reba imodoka", "sellCar": "Gurisha imodoka yawe",
        "alreadyAccount": "Usanzwe ufite konti?",
        "termsPrefix": "Mu gukomeza, wemera", "terms": "Amabwiriza", "privacy": "Politiki y’ibanga"
    },
    "onboarding": {
        "inspectTitle": "Buri modoka irasuzumwa", "inspectSub": "Isuzuma ryemewe ry’ingingo 150.",
        "photosTitle": "Amafoto nyayo, amakuru nyayo", "photosSub": "Bifashwe n’itsinda ryacu.",
        "trustTitle": "Vugana n’abagurisha bagenzuwe", "trustSub": "Mubyumvikane kandi mugirane amasezerano.",
        "updateChoice": "Komeza Sawa Cars ivugururwa mu buryo bwikora. Verisiyo nshya ishyirwaho igihe wongeye gufungura porogaramu — ntibikubangamira uyikoresha."
    },
    "drawer": {
        "buyCar": "Gura imodoka", "browseAll": "Reba imodoka zose", "savedCars": "Imodoka wabikiye", "compareCars": "Geranya imodoka",
        "rent": "Kodesha", "browseRentals": "Reba izikodeshwa", "rentalInquiries": "Ibyifuzo byo gukodesha",
        "financeServices": "Imari na serivisi", "financing": "Kubara inguzanyo", "importDuty": "Umusoro wo gutumiza", "imports": "Imodoka ntumiza",
        "sellCar": "Gurisha imodoka", "verifyIdentity": "Genzura umwirondoro", "submitCar": "Tanga imodoka yawe", "submissions": "Ibyo watanze", "analytics": "Isesengura ry’umugurisha", "trustScore": "Amanota y’icyizere",
        "trustSafety": "Icyizere n’umutekano", "notifications": "Imenyesha", "marketplaceSafety": "Umutekano w’isoko",
        "teamPortal": "Urubuga rw’abakozi", "version": "Sawa Cars v1.0 · Kigali, Rwanda", "certifiedMarketplace": "Isoko ryemewe mu Rwanda"
    },
    "settings": {
        "title": "Igenamiterere", "account": "Konti", "preferences": "Ibyifuzo", "support": "Ubufasha", "app": "Porogaramu", "legal": "Amategeko", "danger": "Ahantu hateye akaga",
        "verification": "Kugenzura n’icyizere", "savedSearches": "Ibyo washakishije wabikiye", "push": "Imenyesha kuri telefoni",
        "language": "Ururimi", "checkUpdates": "Reba ivugurura", "whatsapp": "Twandikire kuri WhatsApp", "call": "Duhamagare", "email": "Twoherereze imeyili", "replay": "Subiramo intangiriro",
        "privacy": "Politiki y’ibanga", "terms": "Amabwiriza y’imikoreshereze", "directDeal": "Itangazo ry’ubucuruzi butaziguye", "delete": "Siba konti yanjye", "deleteHint": "Ntibisubirwaho. Amakuru yawe arasibwa.",
        "verified": "Byagenzuwe", "underReview": "Biracyasuzumwa", "actionNeeded": "Harakenewe igikorwa", "notVerified": "Ntabwo byagenzuwe",
        "closeAccount": "Funga konti yanjye", "closeHint": "Bihita bitangira. Izahanagurwa burundu nyuma y’iminsi {{days}}.",
        "closeWhy": "Kuki ufunga konti yawe? Igisubizo cyawe kidufasha kunoza serivisi.", "closeNote": "Hari ikindi? (si ngombwa)",
        "password": "Ijambo ry’ibanga", "autoUpdate": "Shyiraho ivugurura ryikora",
        "autoUpdateOn": "Verisiyo nshya izashyirwaho igihe wongeye gufungura porogaramu.", "autoUpdateOff": "Uzabazwa mbere y’uko verisiyo nshya ishyirwaho.",
        "pushError": "Ntabwo imenyesha ryakoreshejwe. Reba uburenganzira bw’imenyesha muri telefoni.",
        "wrongPassword": "Iryo jambo ry’ibanga si ryo.", "networkError": "Ntidushoboye kugera kuri Sawa Cars. Reba umurongo wa interineti wongere ugerageze.", "genericError": "Hari ikitagenda. Ongera ugerageze."
    },
    "home": {
        "location": "Aho biherereye", "kigali": "Kigali, Rwanda", "buy": "Gura", "rent": "Kodesha",
        "offlineTitle": "Ntidushoboye kugera kuri Sawa Cars", "offlineSub": "Reba umurongo wa interineti kugira ngo ubone imodoka nshya.",
        "search": "Shakisha ikirango, ubwoko…", "searchRentals": "Shakisha imodoka zikodeshwa…", "rentalInquiry": "Ufite icyifuzo cyo gukodesha gikomeje",
        "certifiedRentals": "Imodoka zemewe zikodeshwa", "certifiedRentalsSub": "Imodoka zizewe kuri buri rugendo.",
        "topDeals": "Amahitamo meza", "topDealsSub": "Byatoranyijwe n’itsinda ryacu · koresha intoki",
        "certifyCar": "Emeza imodoka yanjye", "importDuty": "Umusoro wo gutumiza", "financing": "Kubara inguzanyo", "compare": "Geranya",
        "showroom": "Sawa Center", "onDisplay": "Ziri kumurikwa i Nyarutarama muri iki cyumweru", "carsInShowroom": "Imodoka {{count}} muri showroom",
        "all": "Zose", "imported": "Zatumijwe", "local": "Iz’imbere mu gihugu", "evHybrid": "EV·Hybrid",
        "fresh": "Nshya kuri iki cyumweru", "popular": "Zikunzwe hafi yawe", "browseAll": "Reba imodoka zose",
        "ourPromise": "Isezerano ryacu", "aboutUs": "Abo turi bo", "login": "Injira", "copyright": "© 2026 Sawa Cars. Uburenganzira bwose burabitswe.",
        "trying": "Biragerageza…", "safariReady": "Yiteguye safari", "suv": "SUV", "sedan": "Sedani", "truck": "Ikamyo",
        "safari4x4s": "4×4 ziteguye safari", "availableKigali": "Ziboneka i Kigali", "showrooms": "Showroom",
        "showroomCarsView": "Imodoka {{count}} · reba urutonde", "recentlyViewed": "Waherukaga kureba", "moreLikeSaved": "Zisa n’izo wabikiye", "saved": "Zabitswe", "more": "Ibindi",
        "bannerCertifiedBrand": "Sawa yemeje", "bannerCertifiedTagline": "Buri modoka isuzumwa mbere yo gushyirwa ku isoko.", "bannerCertifiedTag": "Icyizere",
        "bannerInspectionBrand": "Isuzuma ry’ingingo 150", "bannerInspectionTagline": "Abakanishi bemewe. Raporo yuzuye mbere yo kugura.", "bannerInspectionTag": "Isuzuma",
        "bannerSellBrand": "Emeza imodoka yawe", "bannerSellTagline": "Tanga imodoka yawe isuzumwe ingingo 150. Turayishyira ku isoko.", "bannerSellTag": "Gurisha",
        "providerContacted": "uwatanga imodoka yavugishijwe", "awaitingProvider": "dutegereje igisubizo", "inspected": "Isuzumwe {{score}}/150", "perDay": "/umunsi", "seats": "imyanya", "trips": "ingendo", "belowMarket": "{{percent}}% munsi y’isoko", "highDemand": "Irasabwa cyane", "saveCar": "Bika {{title}}", "removeSaved": "Kuraho {{title}} mu zabitswe",
        "carsCount": "{{label}} · imodoka {{count}}", "unavailableUntil": "Ntiboneka kugeza {{date}}"
    },
    "filters": {
        "filters": "Akayunguruzo", "clear": "Kuraho byose", "apply": "Reba imodoka", "noResults": "Nta modoka zabonetse", "adjust": "Hindura ibyo washakishije cyangwa ukureho akayunguruzo",
        "price": "Igiciro", "anyPrice": "Igiciro icyo ari cyo cyose", "underPrice": "Munsi ya RWF {{amount}}", "minimumPrice": "Igiciro gito", "noMinimum": "Nta gipimo gito", "minPrice": "RWF {{amount}}M kuzamura",
        "year": "Umwaka", "anyYear": "Umwaka uwo ari wo wose", "newer": "{{year}} cyangwa nyuma", "mileage": "Intera yakozwe", "anyMileage": "Intera iyo ari yo yose", "underMileage": "Munsi ya {{mileage}} km",
        "inspectionScore": "Amanota y’isuzuma", "anyScore": "Amanota ayo ari yo yose", "scorePlus": "{{score}}+ / 150", "make": "Ikirango", "location": "Aho biherereye", "bodyType": "Ubwoko bw’umubiri", "fuelType": "Ubwoko bwa lisansi", "transmission": "Gearbox",
        "standardNote": "Imodoka ziri ku isoko zigenzurwa n’umugurisha, isuzuma n’amafoto. Raporo y’isuzuma si garanti y’ubucuruzi.", "reset": "Subiramo", "viewCount": "Reba imodoka {{count}}"
    },
    "searchResults": {
        "back": "Subira inyuma", "clearSearch": "Siba ibyo washakishije", "filterButton": "Akayunguruzo", "carsFound": "Habonetse imodoka {{count}}", "rentalsFound": "Habonetse izikodeshwa {{count}}", "plusCars": "Imodoka {{count}}+",
        "saveSearch": "Bika ubushakashatsi", "savedToast": "Ubushakashatsi bwabitswe — tuzakumenyesha imodoka nshya zihuye nabwo.", "allCars": "Imodoka zose", "everyMatch": "Izi ni zo modoka zose zihuye na byo kuri Sawa Cars ubu.",
        "bestMatch": "Ihura neza", "priceLow": "Igiciro ↑", "priceHigh": "Igiciro ↓", "newest": "Nshya", "mileage": "Intera", "showList": "Erekana nk’urutonde", "showGrid": "Erekana nka grille"
    },
    "auth": {
        "signInTitle": "Murakaza neza", "signInSub": "Injira ukomeze kuri Sawa Cars.", "createTitle": "Fungura konti", "createSub": "Gura, bika kandi wandikire abagurisha kuri Sawa Cars.",
        "email": "Imeyili", "validEmail": "Andika imeyili iboneye.", "password": "Ijambo ry’ibanga", "passwordMin": "Ijambo ry’ibanga rigomba kugira inyuguti nibura 6.",
        "forgot": "Waribagiwe?", "enterPassword": "Andika ijambo ry’ibanga", "hidePassword": "Hisha ijambo ry’ibanga", "showPassword": "Erekana ijambo ry’ibanga", "signIn": "Injira",
        "noAccount": "Ntabwo ufite konti?", "signUp": "Iyandikishe", "fullName": "Amazina yose", "namePlaceholder": "Alex Morgan", "nameRequired": "Andika amazina yawe yose.",
        "passwordPlaceholder": "Nibura inyuguti 6", "createAccount": "Fungura konti", "termsPrefix": "Mu gufungura konti wemera", "terms": "Amabwiriza", "privacy": "Politiki y’ibanga",
        "alreadyAccount": "Usanzwe ufite konti?", "accountClosed": "Iyi konti yarafunzwe", "accountClosedMessage": "Wayifunze, ariko amakuru ntiyahanaguwe. Yongera kuyifungura kugira ngo imodoka wabitse, ubutumwa n’amatangazo bigaruke.",
        "accountClosedUntil": "Nyuma ya {{date}} izahanagurwa burundu.", "reopen": "Ongera ufungure konti", "notNow": "Si ubu", "welcomeBack": "Murakaza neza. Konti yawe yongeye gufunguka.",
        "reopenError": "Konti ntiyafunguwe.", "invalidCredentials": "Imeyili cyangwa ijambo ry’ibanga si byo.", "createError": "Konti ntiyafunguwe. Ongera ugerageze."
    },
    "vehicleDetail": {
        "overview": "Incamake", "specifications": "Ibiranga imodoka", "features": "Iby’ingenzi biyigize", "keyDetails": "Amakuru y’imodoka",
        "make": "Ikirango", "model": "Modeli", "year": "Umwaka", "mileage": "Intera yakozwe", "transmission": "Gearbox",
        "fuel": "Ubwoko bwa lisansi", "bodyType": "Ubwoko bw'umubiri", "driveSide": "Uruhande rw'umukono", "doors": "Imiryango", "seats": "Imyanya",
        "color": "Ibara", "vin": "Nimero ya Chassis (VIN)", "plate": "Plake y'imodoka", "inspectionScore": "Amanota y'isuzuma",
        "location": "Aho iherereye", "seller": "Umugurisha", "verifiedSeller": "Umugurisha wagenzuwe",
        "inspectionReport": "Raporo y'isuzuma ry'ingingo 150", "reportSub": "Isuzuma ryizewe ry'ubukanishi n'umutekano", "viewReport": "Reba raporo yuzuye", "passedPoints": "150/150 Byatsinze",
        "vehicleHistory": "Amateka y'imodoka n'inyandiko za RRA", "historySub": "Ubunyiracyo, kwiyandikisha no kwishyura imisoro", "viewHistory": "Reba amateka y'imodoka", "cleanTitle": "Inyandiko zujuje ibyangombwa",
        "financeEst": "Kubara inguzanyo yo kugura imodoka", "monthlyEstimate": "Uruhare rwishyurwa buri kwezi", "financeSub": "Uhereye kuri ~{{amount}}/ukwezi muri banki dukorana", "calculateLoan": "Bara amasezerano y'inguzanyo",
        "directDealNotice": "Ubucuruzi butaziguye hagati y'umuguzi n'umugurisha", "directDealBody": "Sawa Cars ntifata amafaranga kandi ntica amafaranga ya komisiyo. Mwumvikana kandi mukishyurana ubwanyu amaso ku maso.",
        "chatWhatsApp": "Vugana kuri WhatsApp", "callSeller": "Hamagara umugurisha", "inAppChat": "Ohereza ubutumwa muri app",
        "shareCar": "Sangiza iyi modoka", "shareMessage": "Reba iyi {{year}} {{title}} kuri Sawa Cars: {{price}}",
        "similarCars": "Imodoka zisa n'iyi", "saveCar": "Bika mu zo ukunda", "savedCar": "Yabitswe mu zo ukunda",
        "unavailable": "Iyi modoka ntikiri ku isoko", "unavailableSub": "Ishobora kuba yaragurishijwe cyangwa yabitswe n'undi muguzi.",
        "browseCars": "Reba imodoka zihari", "loadingCar": "Turimo gutegura amakuru y'imodoka…", "priceDrop": "Igiciro cyamanutse", "belowMarket": "{{amount}} munsi y'isoko"
    },
    "inspection": {
        "title": "Raporo y'isuzuma ry'ingingo 150", "subtitle": "Yakozwe n'abakanishi babyigiye i Kigali",
        "passedOf": "Ingingo {{score}} kuri 150 zagenzuwe", "scoreGrade": "Ubwiza bwemejwe na Sawa", "certifiedBadge": "Yemejwe",
        "mechanicNotes": "Ibyavuye mu isuzuma n'incamake", "zoneMap": "Ikarita y'ibice by'imodoka", "zoneMapSub": "Uko imodoka imeze inyuma",
        "categories": {
            "engine": "Motto na Gearbox",
            "suspension": "Amashanyarazi n'Imiyoboro",
            "brakes": "Feri, Inziga n'Amapine",
            "electrical": "Amashanyarazi na AC",
            "body": "Imiterere n'Ubuziranenge bw'umubiri",
            "interior": "Imbere n'ibikoresho by'umutekano",
            "docs": "Ibyangombwa n'amategeko"
        },
        "statusPassed": "Byatsinze", "statusAttention": "Kwitondera", "statusFailed": "Hari ikibazo",
        "fullChecklist": "Urutonde rwuzuye rw'ingingo 150", "passedAll": "Ingingo zose zasuzumwe kandi ziremezwa",
        "flagsPresent": "Ibikeneye kwitonderwa byanditswe hasi", "scheduleInspection": "Gena igihe cyo gusuzumisha", "inspectionCenter": "Ikigo cy'isuzuma"
    },
    "vehicleHistory": {
        "title": "Raporo y'amateka y'imodoka", "subtitle": "Inyandiko zizewe zituruka muri RRA na Polisi",
        "rraVerified": "Ibyangombwa byemejwe na RRA", "registrationDate": "Yanditswe bwa mbere mu Rwanda",
        "ownershipHistory": "Amateka y'abayitunze", "previousOwners": "Abayegukanye mbere mu Rwanda",
        "importStatus": "Kwinjira no kwishyura gasutamo", "originCountry": "Igihugu yaturutsemo", "taxCleared": "Imisoro ya gasutamo yarishyuwe",
        "stolenCheck": "Kugenzura muri Polisi na Interpol", "cleanStolen": "Nta bibazo by'ubujura byanditswe",
        "insuranceStatus": "Ubwishingizi na Kontrole Tekinike", "validInspection": "Icyemezo cya Kontrole Tekinike kirakora",
        "chassisVerified": "Nimero ya Chassis na Motto bihura n'ibya RRA", "officialRecordsNote": "Amakuru yose akurwa mu nyandiko zemewe za leta."
    },
    "profile": {
        "guestTitle": "Uri kureba nk'umushyitsi", "guestSub": "Injira kugira ngo ubike imodoka, wandikire abagurisha, kandi ushyireho iyawe.",
        "signInBtn": "Injira", "continueDemo": "Komeza kuri konti y'igerageza",
        "accountTitle": "Konti yanjye", "sellerSection": "Ibikoresho by'umugurisha", "accountSection": "Konti na serivisi",
        "identityVerification": "Kugenzura umwirondoro", "contactVisibility": "Kugaragaza nimero zo kukubona",
        "mySubmissions": "Imodoka natanze", "carValuation": "Imodoka yanjye ihagaze gute?",
        "rentalInquiries": "Ibyifuzo byo gukodesha", "myImports": "Imodoka ntumiza",
        "messages": "Ubutumwa n'ibiganiro", "marketplaceSafety": "Umutekano w'isoko n'Isezerano",
        "howBuyingWorks": "Uburyo kugura bikora", "settings": "Igenamiterere", "helpSupport": "Ubufasha",
        "trustScoreTitle": "Amanota yanjye y'icyizere", "trustScoreSub": "Amanota menshi aha icyizere abaguzi.",
        "points": "amanota", "idPoints": "Gupima Umwirondoro", "salesPoints": "Imodoka zagurishijwe", "responsePoints": "Umuvuduko wo gusubiza", "reviewPoints": "Ibitekerezo by'abaguzi",
        "logoutConfirm": "Urifuza gusohoka muri konti?", "logoutBtn": "Sohoka"
    },
    "saved": {
        "title": "Imodoka zabitswe", "subtitle": "Komeza gukurikirana imodoka wakunze",
        "emptyTitle": "Nta modoka zirabikwa", "emptySub": "Kanda ku mutima ku modoka iyo ari yo yose kugira ngo uyibike hano.",
        "browseCars": "Reba imodoka", "compareSelected": "Geranya izatoranyijwe ({{count}})", "searchAlerts": "Kumenyeshwa ibishya",
        "savedCount": "Imodoka {{count}} zabitswe", "removeSaved": "Kuraho mu zabitswe"
    },
    "messages": {
        "title": "Ubutumwa", "emptyTitle": "Nta butumwa buraboneka", "emptySub": "Vugana n'abagurisha ubakuye ku ipaji y'imodoka kugira ngo mutangire kuganira.",
        "browseCars": "Reba imodoka", "today": "Uyu munsi", "yesterday": "Ejo hashize",
        "typeMessage": "Andika ubutumwa…", "send": "Ohereza", "pinnedListing": "Imodoka muganiraho",
        "viewCar": "Reba imodoka", "directNotice": "Ganira mu mutekano. Ntugatange amafaranga mbere kuri interineti."
    },
    "tools": {
        "dutyTitle": "Kubara umusoro wo gutumiza imodoka muri RRA", "dutySub": "Bara imisoro ya gasutamo, akazi, TVA n'indi misoro ku modoka zitumizwa.",
        "vehicleValue": "Agaciro k'imodoka (CIF) mu RWF", "valuePlaceholder": "urugero: 15,000,000",
        "ageLabel": "Imyaka imodoka imaze", "engineCc": "Ingano ya Motto (cc)", "fuelLabel": "Ubwoko bwa Lisansi",
        "dutyBreakdown": "Imbonerahamwe y'imisoro", "cifValue": "Agaciro ka CIF", "customsDuty": "Umusoro wa Gasutamo (25%)",
        "exciseDuty": "Umusoro w'Akazi (5%–30%)", "vat": "TVA (18%)", "withholdingTax": "Withholding Tax (5%)",
        "infraLevy": "Umusoro w'Ibikorwaremezo (1.5%)", "totalDuties": "Igiteranyo cy'Imisoro", "landedPrice": "Igiciro cyose hamwe i Kigali",
        "calculateBtn": "Bara imisoro yo gutumiza", "ratesNotice": "Bishingiye ku mategeko y'umuryango wa Afurika y'Iburasirazuba (EAC).",
        "financeTitle": "Kubara inguzanyo yo kugura imodoka", "financeSub": "Bara amafaranga uzajya wishyura buri kwezi muri banki dukorana.",
        "carPrice": "Igiciro cy'imodoka (RWF)", "downPayment": "Avansi (Uruhare rwawe)", "loanTerm": "Igihe cy'inguzanyo", "interestRate": "Inyungu ku mwaka (%)",
        "monthlyPayment": "Uruhare rwa buri kwezi", "totalInterest": "Igiteranyo cy'inyungu", "totalLoan": "Amafaranga yose azishyurwa",
        "amortizationTable": "Gahunda yo kwishyura", "disclaimer": "Ibi bishingira ku kwemezwa n'amabanki.",
        "valuationTitle": "Kumenya agaciro k'imodoka ku buntu", "valuationSub": "Menya igiciro nyacyo ku isoko bishingiye ku modoka ziheruka kugurishwa mu Rwanda.",
        "selectMake": "Hitamo ikirango", "selectModel": "Hitamo modeli", "selectYear": "Hitamo umwaka", "selectMileage": "Hitamo intera",
        "estimateBtn": "Bara agaciro ku isoko", "estimatedRange": "Agaciro kagereranyijwe", "comparablesSeen": "Bishingiye ku modoka {{count}} zisa n'iyi zagurishijwe", "valuationNote": "Igiciro gishobora guhinduka bitewe n'uko imodoka imeze mu isuzuma ry'ingingo 150."
    },
    "sell": {
        "title": "Gurisha imodoka yawe bitakuvunnye", "subtitle": "Turayisuzuma, tuyifotore, tuyemeze. Wikiranira 100% by'amafaranga y'igiciro cyayo.",
        "step1Title": "1. Tanga amakuru", "step1Sub": "Tubwire iby'imodoka yawe mu minota 2.",
        "step2Title": "2. Isuzuma ry'ingingo 150", "step2Sub": "Zana imodoka ku kigo cyacu ihambwe raporo y'ubuziranenge.",
        "step3Title": "3. Amafoto meza", "step3Sub": "Tuyifotora amafoto meza y'umwuga ku mpande zose 36.",
        "step4Title": "4. Abaguzi bakuvugisha", "step4Sub": "Abaguzi b'ukuri bavugana nawe ako kanya kuri WhatsApp cyangwa telefoni.",
        "submitMyCar": "Tanga imodoka yanjye", "freeValuation": "Kumenya agaciro ku buntu", "weInspectShoot": "Turagusuzumira tunafotore", "instantEstimate": "Menya igiciro ku isoko"
    },
    "submission": {
        "formTitle": "Kwandikisha imodoka igurishwa", "basicInfo": "1. Amakuru y'ibanze", "pricingMileage": "2. Igiciro n'Intera",
        "featuresCondition": "3. Ibyiyigize n'Uko imeze", "inspectionCenter": "4. Hitamo Ikigo cy'Isuzuma",
        "selectCenter": "Hitamo Ikigo i Kigali", "pricePlaceholder": "Igiciro mu RWF (urugero: 28,000,000)", "mileagePlaceholder": "Intera muri km (urugero: 45,000)",
        "descPlaceholder": "Sobanura uko imodoka yafashwe neza, uko imeze, n'ibindi by'ingenzi…",
        "submitBtn": "Tanga isuzumwe", "submitting": "Turimo kohereza imodoka…",
        "submissionSuccess": "Imodoka yakiriwe!", "successSub": "Itsinda ryacu rigiye gusuzuma ibyo watanze rikubwire igihe cyo kuyizana mu isuzuma."
    },
    "idVerification": {
        "title": "Gusuzuma Umwirondoro", "subtitle": "Abagurisha bagenzuwe babona abaguzi inshuro 3 kurusha abandi.",
        "docType": "Ubwoko bw'icyangombwa", "nationalId": "Indangamuntu y'u Rwanda", "passport": "Pasiporo",
        "uploadFront": "Shyiraho ifoto y'imbere", "uploadBack": "Shyiraho ifoto y'inyuma",
        "submitVerification": "Tanga usuzumwe", "pendingReview": "Umwirondoro uri gusuzumwa",
        "approvedStatus": "Umwirondoro wemejwe ✓", "rejectedStatus": "Hari ibikeneye gukosorwa",
        "privacyNotice": "Ibyangombwa byawe bibikwa mu ibanga rikomeye kandi ntibisangizwa abandi."
    },
    "contactSettings": {
        "title": "Kugaragaza nimero zo kukubona", "subtitle": "Genzura uko abaguzi bemewe bakugeraho ku matangazo yawe.",
        "phoneVisibility": "Kwemerera guhamagarwa kuri telefoni", "phoneSub": "Erekana telefoni yawe ku baguzi binjiye muri konti.",
        "whatsappVisibility": "Kwemerera ubutumwa bwa WhatsApp", "whatsappSub": "Shyiraho buto ya WhatsApp ku modoka zawe ziri ku isoko.",
        "consentNotice": "Amakuru yawe aboneka gusa ku baguzi binjiye muri konti bemeye amabwiriza yo kuvugana bitaziguye.",
        "saveSettings": "Bika ibyo wahisemo", "savedSuccess": "Ibyo wahisemo byahinduwe neza."
    },
    "rentals": {
        "fleetTitle": "Imodoka zikodeshwa zemewe i Kigali", "fleetSub": "Imodoka zifite raporo y'uko zimeze n'abazitanga bagenzuwe.",
        "requestDates": "Hitamo amatariki yo gukodesha", "pickupLocation": "Aho uzayifatira n'aho uzayisubiza",
        "minDays": "Iminsi mito yo gukodesha: {{count}}", "securityDeposit": "Ingwate y'umutekano isubizwa", "depositNote": "Yishyurwa uwatanze imodoka igihe uyifashe.",
        "providerConfirms": "Uwatanze imodoka azemeza ko ihari n'amasezerano yanditse ubwanyu.",
        "submitInquiry": "Saba kureba ko ihari", "inquirySuccess": "Icyifuzo cyoherejwe!", "myInquiriesTitle": "Ibyifuzo byanjye byo gukodesha", "noInquiries": "Nta byifuzo byo gukodesha biraboneka.",
        "notFoundTitle": "Iyi modoka ntiboneka", "notFoundSub": "Ishobora kuba yarahagaritswe cyangwa ikuwe mu modoka zikodeshwa.",
        "goBack": "Subira inyuma", "loading": "Turimo gutegura iyi modoka…", "forRent": "Ikodeshwa", "certified": "Yemejwe {{score}}/150",
        "safariReady": "Yiteguye safari", "share": "Sangiza", "shareMessage": "{{title}} — {{price}}/umunsi kuri Sawa Cars",
        "seats": "imyanya", "gearbox": "Gearbox", "fuel": "Lisansi", "year": "Umwaka",
        "unavailableUntil": "Ntiboneka kugeza {{date}}", "availability": "Kuboneka",
        "availabilityNote": "Uwatanga imodoka wemejwe azemeza imodoka, igiciro n’uko izafatirwa. Kohereza icyifuzo ntibivuze ko imodoka yabitswe cyangwa yasabwe.",
        "pricing": "Ibiciro", "dailyRate": "Igiciro cy’umunsi", "weeklyRate": "Igiciro cy’icyumweru", "saveVsDaily": "Zigama {{amount}} ugereranyije n’umunsi",
        "depositSub": "Umubare watanzwe n’uwatanga imodoka · emeza amabwiriza yanditse", "confirmTerms": "Emeza aya mabwiriza n’uwatanga imodoka",
        "insurance": "Ubwishingizi", "roadside": "Ubufasha mu nzira", "mileageLimits": "Imipaka y’intera",
        "depositTerms": "Amabwiriza y’ingwate no gusubizwa", "safetyLink": "Umutekano n’inshingano ku isoko",
        "inspectionTitle": "Raporo y’isuzuma ry’ingingo 150", "inspectionSub": "Amanota {{score}}/150 · Reba raporo yuzuye",
        "howItWorks": "Uburyo gukodesha bikora",
        "step1Title": "Ohereza icyifuzo", "step1Desc": "Tanga amatariki yawe n’uburyo bwiza bwo kuvugana nawe.",
        "step2Title": "Mwumvikane mu buryo butaziguye", "step2Desc": "Uwatanga imodoka yemeza ko iboneka, igiciro, ubwishingizi, ingwate n’amabwiriza yanditse.",
        "step3Title": "Genzura ikodeshwa", "step3Desc": "Gufata imodoka, kwishyura, uko imodoka imeze no kuyisubiza bikorwa hagati yawe n’uwayitanze.",
        "ctaDailyRental": "Ikodeshwa ry’umunsi", "ctaPerDay": "/ umunsi", "ctaRateNote": "Igiciro giteganywa n’uwatanga imodoka · emeza mu buryo butaziguye",
        "ctaInquiryOnly": "Icyifuzo gusa", "ctaRequestAvailability": "Saba ko iboneka"
    },
    "buyingGuide": {
        "title": "Uburyo bwo kugura imodoka kuri Sawa Cars", "subtitle": "Intambwe 5 zoroshye zo kugura imodoka yemejwe mu mutekano mu Rwanda.",
        "step1": "1. Reba imodoka zifite raporo y'isuzuma ry'ingingo 150",
        "step2": "2. Genzura ibyangombwa, Chassis, n'imisoro ya RRA kuri interineti",
        "step3": "3. Vugana n'umugurisha ako kanya kuri WhatsApp cyangwa telefoni",
        "step4": "4. Hurira ku kigo cya Sawa Center muyigerageze mu muhanda",
        "step5": "5. Wishyure umugurisha amaso ku maso mukore ihererekanya muri RRA",
        "checklistTitle": "Urutonde rw'umutekano w'umuguzi", "safetyTips": "Ntukishyure amafaranga y'avansi kuri interineti. Buri gihe suzumira imodoka ku manywa."
    },
    "sawaPromise": {
        "title": "Isezerano rya Sawa Cars ku isoko", "subtitle": "Isuzuma ryizewe. Nta yandi mafaranga yihishe. Ubucuruzi butaziguye.",
        "whatWeControl": "Ibyo Sawa Cars Yemeza", "whatUsersControl": "Ibyo Umuguzi n'Umugurisha Biyoborera Ubwabo",
        "zeroFees": "Nta komisiyo ku muguzi", "transparentInspections": "Raporo y'ingingo 150 itabogamye"
    },
    "comparison": {
        "title": "Kugereranya Imodoka", "emptyTitle": "Nta modoka zo kugereranya", "emptySub": "Hitamo imodoka 2 cyangwa zirenga mu gihe ushakisha kugira ngo uzigereranye.",
        "addCar": "Ongeraho imodoka", "specDiff": "Erekana itandukaniro", "clearComparison": "Siba ibyo wagereranyije"
    }
}

TRANSLATIONS = {
    "en": DICT_EN,
    "rw": DICT_RW,
    "fr": DICT_FR,
    "sw": DICT_SW,
    "ko": DICT_KO,
    "zh": DICT_ZH,
}

# Check key parity
def flatten(d, prefix=""):
    keys = []
    for k, v in d.items():
        curr = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.extend(flatten(v, curr))
        else:
            keys.append(curr)
    return set(keys)

en_keys = flatten(DICT_EN)
print(f"Total English keys: {len(en_keys)}")

for code, d in TRANSLATIONS.items():
    if code == "en": continue
    k_set = flatten(d)
    diff = en_keys - k_set
    if diff:
        print(f"WARNING: Missing keys in {code}: {diff}")
    else:
        print(f"✓ Language '{code}' has 100% key parity ({len(k_set)} keys)!")

# Write src/i18n/index.js
file_content = f"""// Sawa Cars Mobile Internationalization & Localization Layer (i18n)
// Provides pure, natural, high-quality translations across all 6 supported languages:
// English (en), Kinyarwanda (rw), French (fr), Swahili (sw), Korean (ko), Chinese (zh).

export const LANGUAGES = {json.dumps(LANGUAGES, ensure_ascii=False, indent=2)};

export const DEFAULT_LANGUAGE = 'en';

export const TRANSLATIONS = {json.dumps(TRANSLATIONS, ensure_ascii=False, indent=2)};

export function normalizeLanguage(value) {{
  return LANGUAGES.some((item) => item.code === value) ? value : DEFAULT_LANGUAGE;
}}

export function languageFor(code) {{
  return LANGUAGES.find((item) => item.code === normalizeLanguage(code)) || LANGUAGES[0];
}}

export function translate(language, key, variables = {{}}) {{
  const code = normalizeLanguage(language);
  const lookup = (source) => String(key).split('.').reduce((value, part) => value?.[part], source);
  const value = lookup(TRANSLATIONS[code]) ?? lookup(TRANSLATIONS[DEFAULT_LANGUAGE]) ?? key;
  return String(value).replace(/\\{{\\{{(\\w+)\\}}\\}}/g, (_match, name) => (
    variables[name] == null ? `{{{{${{name}}}}}}` : String(variables[name])
  ));
}}

export function localeFor(code) {{
  return languageFor(code).locale;
}}
"""

with open("src/i18n/index.js", "w", encoding="utf-8") as f:
    f.write(file_content)

print("Successfully wrote updated src/i18n/index.js with full 6-language support!")
