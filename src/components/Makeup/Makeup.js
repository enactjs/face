// Face Decorator: "Make-up". Get it?! :D
//

import hoc from '@enact/core/hoc';
import Skinnable from '@enact/moonstone/Skinnable';
import SpotlightRootDecorator from '@enact/spotlight/SpotlightRootDecorator';
import {ResolutionDecorator} from '@enact/ui/resolution';
import React from 'react';

import screenTypes from './screenTypes.json';

const defaultConfig = {
	ri: {
		screenTypes
	},
	spotlight: true,
	skin: true
};

const Makeup = hoc(defaultConfig, (config, Wrapped) => {
	const {ri, spotlight, noAutoFocus, skin} = config;
	let App = Wrapped;

	if (ri) App = ResolutionDecorator(ri, App);
	if (spotlight) App = SpotlightRootDecorator({noAutoFocus}, App);
	if (skin) App = Skinnable({defaultSkin: 'dark'}, App);

	const Decorator = class extends React.Component {
		static displayName = 'Makeup';

		render () {
			return (
				<App {...this.props} />
			);
		}
	};

	return Decorator;
});

export default Makeup;
export {Makeup};
