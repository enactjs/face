import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {Job} from '@enact/core/util';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import Transition from '@enact/ui/Transition';
import BodyText from '@enact/moonstone/BodyText';
import IconButton from '@enact/moonstone/IconButton';
import Skinnable from '@enact/moonstone/Skinnable';
import SpotlightRootDecorator from '@enact/spotlight/SpotlightRootDecorator';
// import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator';
import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';

import emotions from '../emotions';
import visionMap from '../visionMap';
import connect from '../data/bot';
import Head from '../views/Head';

import css from './App.less';

// Normalize visionMap
// Convert any plain strings to small arrays.
for (const item in visionMap) {
	if (typeof visionMap[item] === 'string') {
		visionMap[item] = [visionMap[item]];
	}
}


const makeTogglerName = (em) => 'toggle' + toCapitalized(em);

const togglePropTypes = {};
for (const em in emotions) {
	togglePropTypes[makeTogglerName(em)] = PropTypes.func;
}

// const MoonstoneControlsPanel = MoonstoneDecorator({float: true}, 'div');
const MoonstoneControlsPanel = SpotlightRootDecorator(
	Skinnable({defaultSkin: 'dark'},
		Cell
	)
);

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes,
		active: PropTypes.bool,
		connected: PropTypes.bool,
		handleReconnect: PropTypes.func,
		label: PropTypes.string
	},

	defaultProps: {
		label: '<N/A>',
		active: false
	},

	styles: {
		css,
		className: 'app enact-unselectable'
	},

	render: ({expression, active, connected, handleReconnect, label, styler, ...rest}) => {
		const toggleButtons = [];
		// console.log('expression:', expression);
		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<ToggleButton key={em} small selected={expression[em]} onClick={rest[toggler]} style={{marginBottom: '0.3em'}}>{emotions[em]}</ToggleButton>);

			delete rest[toggler];
		}
		return (
			<Layout orientation="vertical" {...rest}>
				<MoonstoneControlsPanel shrink className={css.controls}>
					{toggleButtons}
				</MoonstoneControlsPanel>
				<Cell>
					<Head expression={expression} />
				</Cell>
				<MoonstoneControlsPanel shrink className={css.footer}>
					<div className={styler.join(css.adminConsole, {connected})}>
						<IconButton onTap={handleReconnect}>repeat</IconButton>
					</div>
					<Transition visible={active} type="slide" direction="down" duration={active ? 0 : 'long'}>
						<BodyText centered className={css.label}>{label}</BodyText>
					</Transition>
				</MoonstoneControlsPanel>
			</Layout>
		);
	}
});

const Brain = hoc((config, Wrapped) => {
	const cachedToggles = {};

	return class extends React.Component {
		static displayName = 'Brain'

		static propTypes = {
			host: PropTypes.string,
			activeTimeout: PropTypes.number
		}

		static defaultProps = {
			host: '',
			activeTimeout: 3000
		}

		constructor () {
			super();

			// Establish the base states
			this.state = this.resetStateOfAllEmotions();
			this.state.connected = false;
		}

		componentDidMount () {
			this.initializeBotConnection();
		}

		initializeBotConnection () {
			if (!this.bot) {
				console.log('Attempting Connection to', this.props.host);
				this.bot = connect({
					url: 'ws://' + this.props.host,
					onConnection: () => {
						console.log('%cBrain attached', 'color: green');
						this.setState({
							connected: true
						});
					},
					onMessage: message => {
						console.log('%cSaw "%s" with %d\% certanty.', 'color: orange', message.label, parseInt(message.score * 100));
						if (this.job) {
							this.job.stop();
						}

						const state = {
							active: true,
							label: message.label,
							...this.visionIntepretation(message.label)
						};
						this.setState(state);

						this.job = new Job(() => {
							this.setState({active: false});
						}, this.props.activeTimeout);
						this.job.start();
					},
					onClose: () => {
						console.log('%cBrain detached', 'color: red');
						// Activate a reconnect button
						this.setState({
							connected: false
						});
					}
					// onError: message => {
					// 	console.log(`Brain fart`, message);
					// 	// Activate a reconnect button
					// 	this.setState({
					// 		connected: false
					// 	});
					// }
				});
			}
		}

		reconnectToBot = () => {
			this.bot.ros.connect('ws://' + this.props.host);
		}

		toggleExpression = (emotion) => () => {
			const state = {};
			state[emotion] = !this.state[emotion];
			this.setState(state);
		}

		resetStateOfAllEmotions () {
			const state = {};
			for (const em in emotions) {
				cachedToggles[makeTogglerName(em)] = this.toggleExpression(em);
				state[em] = false;
			}
			return state;
		}

		visionIntepretation (saw) {
			const state = this.resetStateOfAllEmotions();
			const addItemToState = item => (state[item] = true);

			if (visionMap[saw]) {
				// Exact matches first
				visionMap[saw].forEach(addItemToState);
			} else {
				// Interpretative sub-matches
				console.groupCollapsed('Attempting to identify "', saw, '".');
				for (const item in visionMap) {
					if (saw.indexOf(item) > -1) {
						// Huzzah! Partial match.
						visionMap[item].forEach(addItemToState);
						console.log('%cFound a match! "%s" is a %s.', 'color: green', saw, item);
					} else {
						console.log('Doesn\'t look like it\'s a ', item);
					}
				}
				console.groupEnd();
			}

			return state;
		}

		/**
		 * Expressions are outward displays of emotions. This consumes emotions and turns them into
		 * expressions.
		 *
		 * @return {Object} A new complete expression state object
		 */
		compileExpressions () {
			const exp = {};
			for (const em in emotions) {
				if (this.state[em]) exp[em] = this.state[em];
			}
			return exp;
		}

		render () {
			const {...rest} = this.props;
			delete rest.activeTimeout;
			delete rest.host;

			return (
				<Wrapped
					{...rest}
					{...cachedToggles}
					connected={this.state.connected}
					handleReconnect={this.reconnectToBot}
					expression={this.compileExpressions()}
					label={this.state.label}
					active={this.state.active}
				/>
			);
		}
	};

});

export default Brain(App);
