import axios from "axios";
import ResponseHandler from "../utils/response_handler.js"
import { StatusCodes } from "http-status-codes";
import Preconditions from "../utils/preconditions.js";
import Strings from "../lang/strings.js";
import moment from "moment";
import { removeLastCharacter } from "../utils/strings.js";
class LiveScoreService {
    static BASE_URL = 'https://apiv3.apifootball.com';
    static API_KEY = process.env.API_FOOTBALL_KEY;

    static async fetchLeague(req, res) {
        const leagues = ['FIFA World Cup', 'UEFA European Championship', 'Copa America', 'African Cup of Nations ',
            'AFC Asian Cup', 'UEFA Champions League', 'UEFA Europa League', 'AFC Champions League', 'English Premier League',
            'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Major League Soccer'];

        let countriesLeague = [];
        let refinedData = [];
        try {
            const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_leagues&APIkey=${process.env.API_FOOTBALL_KEY}`);
            const leagueData = response?.data;
            if (leagueData?.length ?? []) {
                countriesLeague = leagues.flatMap((item) => {
                    const newData = leagueData?.filter((i) => i['league_name'] == item);
                    return newData;
                });
                if (countriesLeague?.length) {
                    for (const team of countriesLeague) {
                        const refinedObj = {
                            id: team?.league_id,
                            name: team?.league_name,
                            country_id: team?.country_id,
                            country_name: team?.country_name,
                            logo: team?.league_logo,
                            country_logo: team?.country_logo,
                            season: team?.league_season
                        }
                        refinedData.push(refinedObj);
                    }
                }
            }
            return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "Leagues", (refinedData ?? []));
        }
        catch (error) {
            console.error(error);
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.ERROR_RESPONSE);
        }
    }

    static async fetchLeagueTeams(req, res) {
        const { league_id } = req.params;
        const badRequestError = Preconditions.checkNotNull({ league_id });
        if (badRequestError) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, badRequestError);
        }
        try {
            let refinedData = [];
            const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_teams&league_id=${league_id}&APIkey=${process.env.API_FOOTBALL_KEY}`);
            const leagueTeamData = response?.data;
            if ((leagueTeamData ?? []).length) {
                for (let team of leagueTeamData) {
                    let refinedObj = {
                        id: team?.team_key,
                        name: team?.team_name,
                        country: team?.team_country,
                        year_founded: team?.team_founded,
                        logo: team?.team_badge
                    }
                    refinedData.push(refinedObj);
                }
            }
            return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "League Teams", refinedData);
        }
        catch (error) {
            console.error(error);
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.ERROR_RESPONSE);
        }
    }

    static async fetchTeam(req, res) {
        const { team_id } = req.params;
        const badRequestError = Preconditions.checkNotNull({ team_id });
        if (badRequestError) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, badRequestError);
        }
        try {
            let players = [];
            let totalPlayers;
            const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_teams&team_id=${team_id}&APIkey=${process.env.API_FOOTBALL_KEY}`);
            const teamData = response?.data;
            if ((teamData ?? []).length) {
                for (let team of teamData) {
                    teamId = team?.team_key;
                    let teamPlayers = team?.players;
                    totalPlayers = teamPlayers?.length;
                    for (let player of teamPlayers ?? []) {
                        let playerPosition = player?.player_type;
                        playerPosition = removeLastCharacter(playerPosition, 's');
                        let playerStats = {
                            id: player?.player_id,
                            picture: player?.player_image,
                            name: player?.player_name,
                            country: player?.player_country,
                            number: player?.player_number,
                            position: playerPosition,
                            age: player?.player_age,
                            goals: player?.player_goals,
                            assists: player?.player_assists,
                            ratings: player?.player_rating,
                            appearances: player?.player_match_played,
                            cards: {
                                yellow: player?.player_yellow_cards,
                                red: player?.player_red_cards
                            }
                        }
                        players.push(playerStats);
                    }
                }
            }
            const team = {
                players: [...players],
                total_players: totalPlayers,
            }
            return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "Team data", team);
        }
        catch (error) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.ERROR_RESPONSE);
        }
    }

    static async teamLeagueFixtures(req, res) {
        const { league_id, team_id } = req.query;
        const badRequestError = Preconditions.checkNotNull({ league_id, team_id });
        if (badRequestError) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.badRequestError);
        }
        try {
            let refinedData = [];
            let startDate = moment().startOf('month').format('YYYY-MM-DD');
            let endDate = moment().endOf('month').format('YYYY-MM-DD');
            const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_events&from=${startDate}&to=${endDate}&league_id=${league_id}&team_id=${team_id}&APIkey=${process.env.API_FOOTBALL_KEY}`);
            const fixtureData = response?.data;
            if (typeof fixtureData == 'object' && fixtureData.hasOwnProperty('message')) {
                let message = fixtureData?.message;
                if (message.includes("No event found")) {
                    return ResponseHandler.sendResponseWithoutData(res, StatusCodes.OK, "No event found");
                }
            }
            if ((fixtureData ?? []).length) {
                for (let fixture of fixtureData) {
                    let fixtureObj = {
                        id: fixture?.match_id,
                        country_id: fixture?.country_id,
                        country_name: fixture?.country_name,
                        league_name: fixture?.league_name,
                        match_date: fixture?.match_date,
                        home_team_id: fixture?.match_hometeam_id,
                        away_team_id: fixture?.awayteam_id,
                        home_team_name: fixture?.match_hometeam?.name,
                        away_team_name: fixture?.match_awayteam?.name,
                        home_team_score: fixture?.match_hometeam_score,
                        away_team_score: fixture?.match_awayteam_score,
                        home_team_logo: fixture?.team_home_badge,
                        away_team_logo: fixture?.team_away_badge
                    }
                    refinedData.push(fixtureObj);
                }
            }
            return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "Fixtures", refinedData);
        }
        catch (error) {
            console.error(error);
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.ERROR_RESPONSE);
        }
    }

    static async leagueFixtureDetails(req, res) {
        const { match_id } = req.params;
        const badRequestError = Preconditions.checkNotNull({
            match_id
        });
        if (badRequestError) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, badRequestError);
        }
        const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_events&match_id=${match_id}&withPlayerStats=1&APIkey=${process.env.API_FOOTBALL_KEY}`);
        const fixtureDetails = response?.data;
        return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "Fixture details", fixtureDetails);
    }

    static async fetchLeagueStandings(req, res) {
        const { league_id } = req.params;
        const badRequestError = Preconditions.checkNotNull({ league_id });
        if (badRequestError) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, badRequestError);
        }
        try {
            let refinedData = [];
            const response = await axios.get(`${LiveScoreService.BASE_URL}/?action=get_standings&league_id=${league_id}&APIkey=${process.env.API_FOOTBALL_KEY}`);
            const leagueTableData = response?.data;
            if (typeof leagueTableData == 'object' && leagueTableData.hasOwnProperty('message')) {
                let message = leagueTableData?.message;
                return ResponseHandler.sendResponseWithoutData(res, StatusCodes.OK, message);
            }
            if ((leagueTableData ?? []).length) {
                for (const standing of leagueTableData) {
                    const refinedObj = {
                        country_name: standing?.country_name,
                        league_id: standing?.league_id,
                        league_name: standing?.league_name,
                        pos: standing?.overall_league_position,
                        W: standing?.overall_league_W,
                        D: standing?.overall_league_D,
                        L: standing?.overall_league_L,
                        F: standing?.overall_league_GF,
                        A: standing?.overall_league_GA,
                        PL: standing?.overall_league_payed,
                        PTS: standing?.overall_league_PTS,
                        logo: standing?.team_badge
                    }
                    refinedData.push(refinedObj);
                }
            }
            return ResponseHandler.sendResponseWithData(res, StatusCodes.OK, "League Standings", refinedData);
        }
        catch (error) {
            return ResponseHandler.sendErrorResponse(res, StatusCodes.BAD_REQUEST, Strings.ERROR_RESPONSE);
        }
    }
}

export default LiveScoreService;