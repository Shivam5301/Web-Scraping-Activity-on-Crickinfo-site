// the purpose of this project is to extract information of the worldcup 2019 from crickinfo and print it in the form of excel and pdf score cards, the real purpose of this project is to learn how to extract information and get experience with js and to have fun with this project

// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib
// input :- node Cricinfo_extrctr.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-schedule-fixtures-and-results


let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

let args = minimist(process.argv);

// Steps 
// download using axios
// read using jsdom
// make excel using excel5node
// make pdf using pdf-lib

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function (response) {
    let html = response.data;

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    // let matchScoreDivs = document.querySelectorAll("div.ds-text-compact-xxs");
    let matches = [];
    let matchScoreDivs = document.querySelectorAll("div.ds-p-4 > div.ds-flex");
    // console.log(matchScoreDivs.length);
    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match = {

        };

        let namePs = matchScoreDivs[i].querySelectorAll("p.ds-truncate"); //namePs = name paragraph's
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;

        let scoreStrong = matchScoreDivs[i].querySelectorAll("div.ds-text-compact-s > strong");
        // console.log(scoreStrong[0].textContent);
        // console.log(scoreStrong[1].textContent);

        if (scoreStrong.length == 2) {
            match.t1s = scoreStrong[0].textContent; //t1s = team 1 score
            match.t2s = scoreStrong[1].textContent;//t2s = team 2 score
        } else if (scoreStrong.length == 2) {
            match.t1s = scoreStrong[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScoreDivs[i].querySelector("p.ds-text-tight-s > span")
        // console.log(spanResult.textContent);
        match.result = spanResult.textContent;


        matches.push(match);
        // console.log(i);
    }

    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putTeamsInTeamsArrayIfMissing(teams, matches[i]);


    }
    for (let i = 0; i < matches.length; i++) {
        putMatchesInAppropriateTeam(teams, matches[i]);

    }

    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    createExcelFile(teams);
    createFolders(teams);

}).catch(function (err) {
    console.log(err);
});

function createFolders(teams) {
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name); 
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }

    }
}

function createScoreCard(teamName, match, matchFileName) {

    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppnScore;
    let result = match.result;

    let originalBytes = fs.readFileSync("Template.pdf");

    let promiseToLoadBytes = pdf.PDFDocument.load(originalBytes);
    promiseToLoadBytes.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(t1, {
            x : 320,
            y : 615,
            size : 14
        });
        page.drawText(t2, {
            x : 320,
            y : 575,
            size : 14
        });
        page.drawText(t1s, {
            x : 320,
            y : 535,
            size : 14
        });
        page.drawText(t2s, {
            x : 320,
            y : 495,
            size : 14
        });
        page.drawText(result, {
            x : 320,
            y : 455,
            size : 12
        });
        let promiseToSave = pdfdoc.save();
        promiseToSave.then(function(changedBytes) {
            fs.writeFileSync(matchFileName, changedBytes);  
        })
        
    })

}

function createExcelFile(teams) {
    let wb = new excel.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name); // make sheets and add teams name in it

        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Oppn Score");
        sheet.cell(1, 4).string("Result");

        for (let j = 0; j < teams[i].matches.length; j++) {

            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppnScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);

        }

    }

    wb.write(args.excel);
}


function putTeamsInTeamsArrayIfMissing(teams, match) {

    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });

    }

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });

    }

}

function putMatchesInAppropriateTeam(teams, match) {

    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppnScore: match.t2s,
        result: match.result
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppnScore: match.t1s,
        result: match.result
    });

}




