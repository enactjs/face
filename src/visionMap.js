/*
 * Associate viewed objects with emotions
 *
 * One or more emotions can be associated with each viewed object, arrays of strings and plain
 * strings are accepted but only one emotion per string. :)
 */

import birdtheword from '../assets/sounds/birdtheword.mp3';


export default {
	'remote control, remote':  'confused',
	'joystick':                'vexed',
	'beer bottle':             'tipsy',
	'phone':                   {sound: {src: birdtheword, duration: 3000}, emotion: 'blush'},
	'bird':                    {sound: birdtheword},

	// Snakes
	'snake':                   ['tremble', 'concerned'],
	'mamba':                   ['tremble', 'concerned'],
	'cobra':                   ['tremble', 'concerned'],
	'viper':                   {emotion: ['tremble', 'concerned']},

	// Frogs and toads
	'toad':                    'attackMode',
	'frog':                    'attackMode',

	'coffee mug':              ['happy', 'concerned']
};
