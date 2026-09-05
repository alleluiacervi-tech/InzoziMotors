# scripts/generate_mobile_i18n.py
import json, os

LANGUAGES = [
    {"code": "en", "label": "English", "nativeLabel": "English", "locale": "en-RW", "flag": "🇬🇧"},
    {"code": "rw", "label": "Kinyarwanda", "nativeLabel": "Kinyarwanda", "locale": "rw-RW", "flag": "🇷🇼"},
    {"code": "fr", "label": "French", "nativeLabel": "Français", "locale": "fr-RW", "flag": "🇫🇷"},
    {"code": "sw", "label": "Swahili", "nativeLabel": "Kiswahili", "locale": "sw-KE", "flag": "🇰🇪"},
    {"code": "ko", "label": "Korean", "nativeLabel": "한국어", "locale": "ko-KR", "flag": "🇰🇷"},
    {"code": "zh", "label": "Chinese", "nativeLabel": "中文", "locale": "zh-CN", "flag": "🇨🇳"},
]

# Namespace dictionaries for each language
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
        "submitInquiry": "Send Availability Inquiry", "inquirySuccess": "Inquiry Sent!", "myInquiriesTitle": "My Rental Inquiries", "noInquiries": "No rental inquiries found."
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

print(f"Total English keys defined: {len(DICT_EN)}")
