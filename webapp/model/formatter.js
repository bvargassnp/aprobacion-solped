sap.ui.define(["sap/ui/core/format/NumberFormat"], function (NumberFormat) {
	"use strict";

	return {
        /**
		 * Format JS Date object to OData date format 
		 * @public
		 * @param {Date} oValue the date field
		 * @returns {String} sValue in OData format yyyy-MM-ddTHH:mm:ss
		 */
		formatDate : function (oValue) {
			if (!oValue) {
				oValue = new Date();
            }
            return oValue.getUTCFullYear()+'-'+(oValue.getUTCMonth()+1)+'-'+oValue.getUTCDate()+'T00:00:00';
        },

        formatHandlerView : function (sId, sDescripcion) {
            let output = "";
            if(sDescripcion !== undefined && sDescripcion !== ""){
                output = sId + " (" + sDescripcion + ")";
            } else {
                output = sId;
            }

            return output;

        },       
    };
});   