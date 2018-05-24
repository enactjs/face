import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';

import Head from '../views/Head';

import css from './App.less';

const emotions = {
	angry: 'Angry',
	attackMode: 'Attack Mode',
	confused: 'Confused',
	happy: 'Happy',
	sad: 'Sad',
	vexed: 'Vexed'
};

const App = kind({
	name: 'App',

	propTypes: {
		toggleAngry: PropTypes.func,
		toggleAttackMode: PropTypes.func,
		toggleConfused: PropTypes.func,
		toggleHappy: PropTypes.func,
		toggleSad: PropTypes.func,
		toggleVexed: PropTypes.func
	},

	styles: {
		css,
		className: 'app'
	},

	render: ({expression, toggleAngry, toggleAttackMode, toggleConfused, toggleHappy, toggleSad, toggleVexed, ...rest}) => {
		delete rest.toggleAngry;
		delete rest.toggleAttackMode;
		delete rest.toggleConfused;
		delete rest.toggleHappy;
		delete rest.toggleSad;
		delete rest.toggleVexed;
		return (
			<Layout orientation="vertical" {...rest}>
				<Cell shrink className={css.controls}>
					<ToggleButton onClick={toggleAngry}>Angry</ToggleButton>
					<ToggleButton onClick={toggleAttackMode}>Attack Mode</ToggleButton>
					<ToggleButton onClick={toggleConfused}>Confused</ToggleButton>
					<ToggleButton onClick={toggleHappy}>Happy</ToggleButton>
					<ToggleButton onClick={toggleSad}>Sad</ToggleButton>
					<ToggleButton onClick={toggleVexed}>Vexed</ToggleButton>
				</Cell>
				<Cell>
					<Head expression={expression} />
				</Cell>
			</Layout>
		);
	}
});

const Brain = hoc((config, Wrapped) => {

	// const express = (emotion) => {

	// };

	const cachedToggles = {};

	return class extends React.Component {
		static displayName = 'Brain'

		constructor () {
			super();

			// Establish the base states
			const state = {};
			for (const em in emotions) {
				cachedToggles['toggle' + toCapitalized(em)] = this.toggleExpression(em);
				state[em] = false;
			}

			// this.state = {
			// 	angry: false,
			// 	confused: false,
			// 	happy: false,
			// 	sad: false
			// };

			this.state = state;
		}

		toggleExpression = (emotion) => () => {
			const state = {};
			state[emotion] = !this.state[emotion];
			this.setState(state);
		}

		// toggleAngry = () => this.setState({angry: !this.state.angry})
		// toggleConfused = () => this.setState({confused: !this.state.confused})
		// toggleHappy = () => this.setState({happy: !this.state.happy})
		// toggleSad = () => this.setState({sad: !this.state.sad})

		compileExpressions () {
			const exp = {};
			for (const em in emotions) {
				if (this.state[em]) exp[em] = this.state[em];
			}
			// if (this.state.angry) exp.angry = this.state.angry;
			// if (this.state.confused) exp.confused = this.state.confused;
			// if (this.state.happy) exp.happy = this.state.happy;
			// if (this.state.sad) exp.sad = this.state.sad;
			// console.log('compileExpressions:', exp);
			return exp;
		}

		render () {
			// console.log('cachedToggles:', cachedToggles);
			return (
				<Wrapped
					{...this.props}
					{...cachedToggles}
					// toggleAngry={this.toggleAngry}
					// toggleConfused={this.toggleConfused}
					// toggleHappy={this.toggleHappy}
					// toggleSad={this.toggleSad}
					expression={this.compileExpressions()}
				/>
			);
		}
	};

});

export default Brain(App);
// export default App;
