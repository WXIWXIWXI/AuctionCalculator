var itemsList = [];
var personsList = [];
var labelsList = [];
var languagesList = [];

// get the jsons
async function getJSON(url) {
    return fetch(url)
        .then((response)=>response.json())
        .then((responseJson)=>{return responseJson});
}

// read in all the info
async function ParseJSONs() {

    // Items
    var json_items = await getJSON('./json/items.json');
    itemsList = json_items.item;

    // persons
    var json_persons = await getJSON('./json/persons.json');
    personsList = json_persons.person;

    // labels
    var json_labels = await getJSON('./json/label.json');
    labelsList = json_labels.label;

    // Languages
    var json_languages = await getJSON('./json/languages.json');
    languagesList = json_languages.language;

    // sort languages
    languagesList.sort(function(a,b) {
        var aa = a.name.toLowerCase();
        var bb = b.name.toLowerCase();

        if (aa > bb) return 1;
        if (aa < bb) return -1;
        return 0
    });

    // create the options for the select and make english the default language
    var selectLanguage = document.getElementById("languages");
    var indexOfEnglish;
    for (i = 0; i < languagesList.length; i++) {
        var languageOption = document.createElement("option");
        languageOption.text = languagesList[i].name;
        selectLanguage.add(languageOption);
        if(languagesList[i].name == "English") {
            indexOfEnglish = i;
        }
    }

    document.getElementById("languages").selectedIndex = indexOfEnglish;

    fillPositions();
}

// return given number but with 00 in the end
function SmoothValue(value) {
    return (Math.floor((value / 100)) * 100);
}

// returns the price a item will have
function PriceOfItem(quantity, priceofItem, discountRate) {
    var discountOfItem = (100.0 - (quantity * discountRate)) / 100.0;
    var a = SmoothValue(quantity * priceofItem * discountOfItem + 0.5);
    return a;
}

// return multiplier for item price depending if the given person likes the given item
function GetBudgetMulitplierForItem(person, itemName) {
    if(itemName == person.lovedItem) {
        return person.lovedBudgetRate;
    }
    else {
        return person.budgetRate;
    }
}

// return the maximum a given person will pay for an given item
function MaxPriceOfPerson(quantity, item, person) {
    var maxPrice = PriceOfItem(quantity, item.basePrice, item.discountRate);
    var index = item.localizedNames.map(e => e.language_ID).indexOf("en");
    var itemName = item.localizedNames[index].name;
    return (maxPrice * GetBudgetMulitplierForItem(person, itemName));
}

// return the lowest bid needed to win the auction
function OptimalBidForAuction(quantity, item, person1, person2, startingPrice) {
    var person1MaxPrice = MaxPriceOfPerson(quantity, item, person1);
    var person2MaxPrice = MaxPriceOfPerson(quantity, item, person2);

    var optimalPrice;
    if (person1MaxPrice > person2MaxPrice) {
        optimalPrice = SmoothValue(person1MaxPrice) - person1.minimumBid + 500;
    }
    else {
        optimalPrice = SmoothValue(person2MaxPrice) - person2.minimumBid + 500;
    }
    return FixImpossibleBid(optimalPrice, startingPrice);
}

// return possible bid (bids can only be in 500 steps of the starting price)
function FixImpossibleBid(bid, startPrice) {
    var difference = Math.floor(bid - startPrice);
    var factor = Math.floor(difference / 500);
    var offset = difference - (factor * 500);
    var fixedBid = bid - offset;
    return fixedBid;
}

// return the languageID of the selected item
function getSelectedLanguageID() {
    var selectLanguageName = document.getElementById("languages").value;
    for (i = 0; i < languagesList.length; i++) {
        if(languagesList[i].name == selectLanguageName) {
            return languagesList[i].identifier;
        }
    }
}

// fill all forms with stuff
function fillPositions() { 
    // set all the language stuff
    var selectedLanguageID = getSelectedLanguageID();
    document.getElementById("floatItems").innerHTML = GetLocalizedLabelsText("item", selectedLanguageID)
    document.getElementById("floatLanguages").innerHTML = GetLocalizedLabelsText("language", selectedLanguageID)
    document.getElementById("floatPerson1").innerHTML = GetLocalizedLabelsText("bidder", selectedLanguageID)
    document.getElementById("floatPerson2").innerHTML = GetLocalizedLabelsText("bidder", selectedLanguageID)

    // sort the items
    itemsList.sort(function(a,b) {
        var indexA = a.localizedNames.map(e => e.language_ID).indexOf(selectedLanguageID);
        var indexB = b.localizedNames.map(e => e.language_ID).indexOf(selectedLanguageID);

        var aa = a.localizedNames[indexA].name.toLowerCase();
        var bb = b.localizedNames[indexB].name.toLowerCase();

        if (aa > bb) return 1;
        if (aa < bb) return -1;
        return 0
    });

    // fill item select
    var selectItems = document.getElementById("items");
    selectItems.options.length = 0;
    for (i = 0; i < itemsList.length; i++) {
        var index = itemsList[i].localizedNames.map(e => e.language_ID).indexOf(selectedLanguageID);
        var itemOption = document.createElement("option");
        itemOption.text = itemsList[i].localizedNames[index].name;
        selectItems.add(itemOption);
    }

    // fill both bidder selects
    var selectPerson1 = document.getElementById("person1");
    var selectPerson2 = document.getElementById("person2");
    selectPerson1.options.length = 0;
    selectPerson2.options.length = 0;
    for (i = 0; i < personsList.length; i++) {
        var index = personsList[i].localizedDescriptions.map(e => e.language_ID).indexOf(selectedLanguageID);

        var person1Option = document.createElement("option");
        var person2Option = document.createElement("option");
        person1Option.text = personsList[i].localizedDescriptions[index].description;
        person2Option.text = personsList[i].localizedDescriptions[index].description;
        selectPerson1.add(person1Option);
        selectPerson2.add(person2Option);
    }
    selectPerson2.selectedIndex = 1;

    UpdateQuantityOfSelectedItem();
}

// return the label text in the right language
function GetLocalizedLabelsText(labelName, selectedLanguageID) {
    var indexName = labelsList.map(e => e.name).indexOf(labelName);
    var indexLanguage = labelsList[indexName].translatedTexts.map(e => e.language_ID).indexOf(selectedLanguageID);
    if(indexLanguage == -1) {
        return "--" + labelName + "--";
    }
    else {
        return labelsList[indexName].translatedTexts[indexLanguage].text;
    }
}

// return info text with bid range and max bid of given person
function GetInfoAboutPerson(quantity, person, item, selectedLanguageID) {
    var personMaxPrice = SmoothValue(MaxPriceOfPerson(quantity, item, person));
    var personInfo = "(" + GetLocalizedLabelsText("personInfoBids", selectedLanguageID) + ": " + GetLocalisationOfNumber(person.minimumBid, selectedLanguageID, 0) + " - " + GetLocalisationOfNumber(person.maximumBid, selectedLanguageID, 0) + " | " + GetLocalizedLabelsText("personInfoMax", selectedLanguageID) + ": " + GetLocalisationOfNumber(personMaxPrice, selectedLanguageID, 0) + ")";
    return personInfo;
}

// returns a localized number with given digits
function GetLocalisationOfNumber(number, lang, minimumDigits) {
    if(number == -1) {
        return "-";
    }
    else {
        return number.toLocaleString(lang, {minimumFractionDigits: minimumDigits, maximumFractionDigits: 2});
    }
}

// set the correct values for the min and max of the quantity input
function UpdateQuantityOfSelectedItem() {
    var selectedItem = itemsList[document.getElementById("items").selectedIndex];
    var inputQuantity = document.getElementById("quantity");
    // set min and max of possible quantites
    inputQuantity.min = selectedItem.minQuantity;
    inputQuantity.max = selectedItem.maxQuantity;
    // set quantity to min
    inputQuantity.value = selectedItem.minQuantity;
    Update();
}

// changes the color of the Discount section of the UI
function UpdateBorder(border, borderColor) {
    // remove any possible color
    document.getElementById(border).classList.remove('border-danger');
    document.getElementById(border).classList.remove('border-warning');
    document.getElementById(border).classList.remove('border-success');
    document.getElementById(border).classList.remove('bg-danger');
    document.getElementById(border).classList.remove('bg-warning');
    document.getElementById(border).classList.remove('bg-success');
    
    // add new one
    document.getElementById(border).classList.add('border-' + borderColor);
    document.getElementById(border).classList.add('bg-' + borderColor);
}

// main function that updates all the info on screen
function Update() {
    var selectedItem = itemsList[document.getElementById("items").selectedIndex];
    var selectedPerson1 = personsList[document.getElementById("person1").selectedIndex];
    var selectedPerson2 = personsList[document.getElementById("person2").selectedIndex];
    var selectedLanguageID = getSelectedLanguageID();
    var inputQuantity = document.getElementById("quantity");

    var quantity = inputQuantity.value;

    // quantity Range
    document.getElementById("floatQuantity").innerHTML = GetLocalizedLabelsText("quantity", selectedLanguageID) + " (" + selectedItem.minQuantity + "-" + selectedItem.maxQuantity + ")";
    
    // starting price of auction
    var startingPrice = PriceOfItem(quantity, selectedItem.minPrice, selectedItem.discountRate);
    document.getElementById("startingPrice").innerHTML = GetLocalizedLabelsText("startingBid", selectedLanguageID) + ": " + GetLocalisationOfNumber(startingPrice, selectedLanguageID, 0);
    
    // optimal last bid
    var optimalLastBid = OptimalBidForAuction(quantity, selectedItem, selectedPerson1, selectedPerson2, startingPrice);
    
    document.getElementById("optimalLastBid").innerHTML = GetLocalizedLabelsText("optimalBid", selectedLanguageID) + ": " + GetLocalisationOfNumber(optimalLastBid, selectedLanguageID, 0);

    // fill info about Person1
    document.getElementById("person1Info").innerHTML = GetInfoAboutPerson(quantity, selectedPerson1, selectedItem, selectedLanguageID);

    // fill info about Person2
    document.getElementById("person2Info").innerHTML = GetInfoAboutPerson(quantity, selectedPerson2, selectedItem, selectedLanguageID);

    // price per item
    var pricePerItem = optimalLastBid / quantity;
    document.getElementById("pricePerItem").innerHTML = GetLocalizedLabelsText("pricePerItem", selectedLanguageID) + ": " + GetLocalisationOfNumber(pricePerItem, selectedLanguageID, 2);
    
    // best possible price
    var startingPriceatMaxQuantity = PriceOfItem(selectedItem.maxQuantity, selectedItem.minPrice, selectedItem.discountRate);
    var bestPossibleOptimalBid = OptimalBidForAuction(selectedItem.maxQuantity, selectedItem, personsList[0], personsList[1], startingPriceatMaxQuantity);
    var bestPossiblePricePerItem = bestPossibleOptimalBid / selectedItem.maxQuantity;
    document.getElementById("bestPossiblePrice").innerHTML = "(" + GetLocalizedLabelsText("bestPossiblePrice", selectedLanguageID) + ": " + GetLocalisationOfNumber(bestPossiblePricePerItem, selectedLanguageID, 2) + ")";

    // regularPrice of item
    var regularPrice = parseInt(selectedItem.regularPrice);
    document.getElementById("regularPrice").innerHTML = GetLocalizedLabelsText("regularPrice", selectedLanguageID) + ": " + GetLocalisationOfNumber(regularPrice, selectedLanguageID, 0);

    // discount/Mark-ups per item
    if(regularPrice == -1) {
        document.getElementById("discountPerItem").innerHTML = GetLocalizedLabelsText("discount", selectedLanguageID) + ": -";
        UpdateBorder("discountBorder", "warning");
        document.getElementById("bestPossibleDeal").innerHTML =  GetLocalizedLabelsText("bestPossibleDeal", selectedLanguageID) + ": - ";
        UpdateBorder("bestPossibleBorder", "warning");
    }
    else {
        var discountPerItem = ((pricePerItem / regularPrice)-1) * 100;
        var discountLabelText;
        if(discountPerItem < 0) {
            discountLabelText = GetLocalizedLabelsText("discount", selectedLanguageID);
            UpdateBorder("discountBorder", "success");
        }
        else {
            discountLabelText = GetLocalizedLabelsText("markup", selectedLanguageID);
            UpdateBorder("discountBorder", "danger");
        }
        document.getElementById("discountPerItem").innerHTML = discountLabelText + " " + GetLocalisationOfNumber(Math.abs(discountPerItem), selectedLanguageID, 2) + "%";
        
        var bestPossibleDicountPerItem = ((bestPossiblePricePerItem / regularPrice)-1) * 100;
        var bestPossibleDealLabelText;
        if(bestPossibleDicountPerItem < 0) {
            bestPossibleDealLabelText = GetLocalizedLabelsText("discount", selectedLanguageID);
            UpdateBorder("bestPossibleBorder", "success");
        }
        else {
            bestPossibleDealLabelText = GetLocalizedLabelsText("markup", selectedLanguageID);
            UpdateBorder("bestPossibleBorder", "danger");
        }
        document.getElementById("bestPossibleDeal").innerHTML = GetLocalizedLabelsText("bestPossibleDeal", selectedLanguageID) + ": " + bestPossibleDealLabelText + " " + GetLocalisationOfNumber(Math.abs(bestPossibleDicountPerItem), selectedLanguageID, 2) + "%";
    }
}