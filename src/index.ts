import { nanoid } from 'nanoid';
import { corsHeaders, handleCORSRequest } from "./cors";
import { sortLeaderboard, sortModes, sorters } from "./sorter";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method == 'GET')
			return handleRequest(request, env);
		else if (request.method == 'POST')
			return handleCreateUser(request, env);
		else if (request.method == 'OPTIONS')
			return handleCORSRequest(request);
		else
			return new Response("No such method", { headers: corsHeaders, status: 404 });
	}
} satisfies ExportedHandler<Env>

async function handleCreateUser(request: Request, env: Env) {
	let params = await request.formData();
	if (params.get('username')) {
		let username = params.get('username');
		let theme = params.get('theme');
		if (!theme) theme = 'default';
		if (typeof username === 'string' && username.match(/[\w\d]{3,15}/)) {
			let profile = await env.DATA.get(`profile_${username}`);
			if (!profile) {
				let secret = nanoid(5).toLowerCase().replace(/[_-]/, 'z');
				let profile = JSON.stringify({ secret: secret, theme: theme });
				await env.DATA.put(`profile_${username}`, profile);
				return new Response(
					profile,
					{ headers: { ...corsHeaders, 'content-type': 'application/json;charset=UTF-8' } }
				);
			} else {
				console.log(profile)
				return new Response("This username is taken!", { status: 403, headers: corsHeaders });
			}
		} else {
			return new Response("This username doesn't fit the criteria!", { status: 400, headers: corsHeaders });
		}
	} else {
		return new Response("The username parameter is missing.", { status: 400, headers: corsHeaders });
	}
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
	const urldata = new URL(request.url);
	const params = urldata.searchParams;
	const scope = params.get('scope');
	if (params.has('modified')) { // Cache check mode
		return new Response(await env.DATA.get('last_modified'), { headers: corsHeaders });
	}
	else if (params.get('secret')) { // Write mode
		let username = params.get('username');
		if (username) {
			username = username.toLowerCase();
			const rawprofile = await env.DATA.get(`profile_${username}`);
			let profile = JSON.parse(rawprofile || '');
			if (profile) {
				if (params.get('secret') == profile.secret) {
					if (scope) { // Record high score
						if (params.get('score')) {
							let score = JSON.parse('{"value":' + params.get('score') + '}').value;

							let load = await env.DATA.get(scope);
							if (load == null) load = '{}'; // Create scope if not exist

							let board = JSON.parse(load);
							if (username in board && !params.get('force')) {
								const sortmode = scope.split('_')[0] as sortModes;
								let sorter = sorters[sortmode];
								if (sorter([null, board[username]], [null, score]) > 0) {
									board[username] = score;
								} else {
									return new Response("You didn't beat your highscore.", { headers: corsHeaders });
								}
							} else {
								board[username] = score;
							}

							let save = JSON.stringify(board);
							await env.DATA.put(scope, save);
							await env.DATA.put('last_modified', (new Date()).valueOf().toString());

							return new Response("Your highscore has been saved.", { headers: corsHeaders });

						} else {
							return new Response("score parameter missing!", { headers: corsHeaders, status: 400 });
						}
					} else { // Update profile
						if (params.get('theme')) {
							profile.theme = params.get('theme');
							await env.DATA.put(`profile_${username}`, JSON.stringify(profile));
						}
						return Response.json(profile, { headers: corsHeaders });
					}
				} else {
					return new Response("The secret was incorrect.", { headers: corsHeaders, status: 403 });
				}
			} else {
				return new Response("Register before you send a highscore!", { status: 401, headers: corsHeaders });
			}
		} else {
			return new Response("username parameter missing!", { headers: corsHeaders, status: 400 });
		}
	} else if (scope) { // Leaderboard mode
		let result: { [id: string]: any };

		if (scope.indexOf('*') >= 0) {
			const username = params.get('username');
			if (username) {
				let highscores = await env.DATA.list();
				let keys = highscores.keys.map((a) => a.name);
				result = {};
				for (var key of keys) {
					if (key.startsWith(scope.slice(0, scope.indexOf('*')))) {
						const data = await env.DATA.get(key) as string;
						let entries = sortLeaderboard(data, key);
						let topUsernames = entries.map((a) => a[0]);
						if (topUsernames.indexOf(username) >= 0)
							result[key.slice(scope.indexOf('*'))] = topUsernames.indexOf(username) + 1;
					}
				}
			} else {
				return new Response("username parameter missing!", { headers: corsHeaders, status: 400 });
			}
		} else {
			result = JSON.parse(await env.DATA.get(scope) || '{}');
		}

		return Response.json(result, { headers: corsHeaders });
	}
	return new Response("Invalid request", { headers: corsHeaders, status: 400 });
}