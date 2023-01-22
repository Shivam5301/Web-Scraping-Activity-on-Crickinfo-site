// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib
// input :- node Cric.js --excel=Worldcup.csv --dataFolder=Teams_Folder --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-schedule-fixtures-and-results


let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
const { match } = require("assert");

let args = minimist(process.argv);

let responseKaPromise = axios.get(args.source);

responseKaPromise.then(function (response) {
    let html = response.data;

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matchScoreDivs = document.querySelectorAll("div.ds-p-4 > div.ds-flex");
    let matches = [];

    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: "",

        };
        let teamsName = matchScoreDivs[i].querySelectorAll("div.ds-flex > p.ds-text-tight-m");
        match.t1 = teamsName[0].textContent
        match.t2 = teamsName[1].textContent

        let teamScore = matchScoreDivs[i].querySelectorAll("div.ds-text-compact-s > strong");
        if (teamScore.length == 2) {
            match.t1s = teamScore[0].textContent;
            match.t2s = teamScore[1].textContent;

        } else if (teamScore.length == 1) {
            match.t1s = teamScore[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let teamResult = matchScoreDivs[i].querySelector("p.ds-truncate > span");
        match.result = teamResult.textContent;

        matches.push(match);

    }
    let matchesKaJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesKaJSON, "utf-8");

    let teams = [];

    // pushing team in teams array is not present at there
    for (let i = 0; i < matches.length; i++) {
        pushTeaminteamsArrayifNotThereAlready(teams, matches[i].t1);
        pushTeaminteamsArrayifNotThereAlready(teams, matches[i].t2);
    }

    // pushing match at appropriate place
    for (let i = 0; i < matches.length; i++) {
        pushaMatchInAppropriateTeams(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
        pushaMatchInAppropriateTeams(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);

    }

    let teamsKaJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsKaJSON, "utf-8");

    prepareExcel(teams, args.excel);

    prepareFolderAndPDFs(teams, args.dataFolder);

})
function prepareExcel(teams, excelFileName) {
    let wb = new excel4node.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let teamSheet = wb.addWorksheet(teams[i].name);

        teamSheet.cell(1, 1).string("VS");
        teamSheet.cell(1, 2).string("Self Score");
        teamSheet.cell(1, 3).string("Oppn Score");
        teamSheet.cell(1, 4).string("Result");

        for (let j = 0; j < teams[i].matches.length; j++) {
            teamSheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            teamSheet.cell(2 + j, 2).string(teams[i].matches[j].Self_Score);
            teamSheet.cell(2 + j, 3).string(teams[i].matches[j].Oppn_Score);
            teamSheet.cell(2 + j, 4).string(teams[i].matches[j].Result);
        }
    }

    wb.write(excelFileName);


}

function prepareFolderAndPDFs(teams, dataFolder) {
    if (fs.existsSync(dataFolder) == true) {
        fs.rmdirSync(dataFolder, {recursive :true})
    }

    fs.mkdirSync(dataFolder);

    for (let i = 0; i < teams.length; i++) {
        let teamFolderName = path.join(dataFolder, teams[i].name)
        if (fs.existsSync(teamFolderName) == false) {
            fs.mkdirSync(teamFolderName);
        }

        for (let j = 0; j < teams[i].matches.length; j++) {
           let match = teams[i].matches[j];
           createMatchScoreCardPDF(teamFolderName, teams[i].name, match);
        }
    }

}

function createMatchScoreCardPDF(teamFolderName, homeTeam, match) {
    let matchFileName = path.join(teamFolderName, match.vs);

    let teamplateFileBytes = fs.readFileSync("Template.pdf")
    let pdfDocKaPromise = pdf.PDFDocument.load(teamplateFileBytes);
    pdfDocKaPromise.then(function (pdfDoc) {
        let page = pdfDoc.getPage(0);

        page.drawText(homeTeam, {
            x : 320,
            y : 615,
            size : 14
        });
        page.drawText(match.vs,{
            x : 320,
            y : 575,
            size : 14
        });
        page.drawText(match.Self_Score,{
            x : 320,
            y : 535,
            size : 14
        });
        page.drawText(match.Oppn_Score,{
            x : 320,
            y : 495,
            size : 14
        });
        page.drawText(match.Result,{
            x : 320,
            y : 455,
            size : 12
        });
        
        let changedBytesKaPromise = pdfDoc.save();
        changedBytesKaPromise.then(function (changedBytes) {
            if (fs.existsSync(matchFileName + ".pdf") == true) {
                fs.writeFileSync(matchFileName + "1.pdf", changedBytes);
            }else{
                fs.writeFileSync(matchFileName + ".pdf", changedBytes);
            }
        })
    })
}


function pushaMatchInAppropriateTeams(teams, homeTeam, oppTeam, homeTeamScore, oppnTeamScore, result) {
    let teamidx = -1 // team index empty

    for (let j = 0; j < teams.length; j++) {
        if (teams[j].name == homeTeam) {
            teamidx = j;
            break;
        }
    }

    let team = teams[teamidx];
    team.matches.push({
        vs: oppTeam,
        Self_Score: homeTeamScore,
        Oppn_Score: oppnTeamScore,
        Result: result
    })

}

function pushTeaminteamsArrayifNotThereAlready(teams, teamName) {
    let teamidx = -1 // team index empty

    for (let j = 0; j < teams.length; j++) {
        if (teams[j].name == teamName) {
            teamidx = j;
            break;
        }
    }

    if (teamidx == -1) {
        let team = {
            name: teamName,
            matches: []
        }
        teams.push(team);
    }
}