/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comnespola./aprobacionsolicituddepedido/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
