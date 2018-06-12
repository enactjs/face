/*
 * Associate viewed objects with emotions
 *
 * One or more emotions can be associated with each viewed object, arrays of strings and plain
 * strings are accepted but only one emotion per string. :)
 */

export default {
	'remote control, remote':          'confused',
	'joystick':                        'vexed',

	// Snakes
	'green mamba':                     ['tremble', 'concerned'],
	'green snake, grass snake':        ['tremble', 'concerned'],
	'Indian cobra, Naja naja':         ['tremble', 'concerned'],
	'hognose snake, puff adder, sand viper':  ['tremble', 'concerned'],

	'tailed frog, bell toad, ribbed toad, tailed toad, Ascaphus trui':  'attackMode',
	'coffee mug':                      ['happy', 'concerned']
};
