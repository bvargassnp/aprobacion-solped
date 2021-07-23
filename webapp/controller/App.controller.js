sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../service/Workflow",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/m/Label",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, Workflow, JSONModel, MessageBox, Filter, Label, FilterOperator, formatter) {
        "use strict";
        var oThat, path, sCreatedByUser;
        return Controller.extend("com.nespola.aprobacionsolicituddepedido.controller.App", {
            formatter: formatter,
            onInit: function () {
                oThat = this;

                oThat.getLoggedUser().then(function (data) {
                    sCreatedByUser = data.Resources[0].userName.toUpperCase();
                });
                oThat.onGetMyInbox($.getComponentDataMyInbox);
                oThat.onCreateButtonAction();

            },
            getLoggedUser: function () {

                try {
                    return new Promise(function (resolve, reject) {
                        if (sap.ushell !== undefined) {
                            var sMail = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
                            if (sMail === undefined) {
                                sMail = "";
                            }
                        }

                        var userModel = new JSONModel({});
                        var sPath = $.appModulePath + "/iasscim/service/scim/Users?filter=emails eq '" + sMail + "'";
                        userModel.loadData(sPath, null, true, 'GET', null, null, {
                            'Content-Type': 'application/scim+json'
                        }).then(() => {
                            var oDataTemp = userModel.getData();
                            resolve(oDataTemp);
                        }).catch(err => {
                            reject("Error");
                        });
                    });
                } catch (oError) {
                    sap.m.MessageToast.show(oError);
                }
            },
            onErrorMessage: function (oError) {
                try {
                    if (oError.responseJSON) {
                        if (oError.responseJSON.error) {
                            MessageBox.error(oError.responseJSON.error.message.value);
                        } else {
                            if (oError.responseJSON[0]) {
                                if (oError.responseJSON[0].description) {
                                    MessageBox.error(oError.responseJSON[0].description);
                                }
                            } else {
                                MessageBox.error(oError.responseJSON.response.description);
                            }
                        }
                    } else if (oError.responseText) {
                        try {
                            if (oError.responseText) {
                                var oErrorRes = JSON.parse(oError.responseText),
                                    sErrorDetails = oErrorRes.error.innererror.errordetails;
                                MessageBox.error(sErrorDetails[0].message);
                            } else {
                                oThat.onErrorMessage("", "errorSave");
                            }
                        } catch (error) {
                            MessageBox.error(oError.responseText);
                        }
                    } else if (oError.message) {
                        MessageBox.error(oError.message);
                    } else {
                        MessageBox.error(oError);
                    }
                } catch (oErrorT) {
                    oThat.onErrorMessage(oErrorT);
                }
            },

            onGetMyInbox: function (getComponentDataMyInbox) {
                try {
                    sap.ui.core.BusyIndicator.show(0);
                    var startupParameters = getComponentDataMyInbox === undefined ? undefined : getComponentDataMyInbox.startupParameters;
                    //valida si entra por el workflow
                    //Validacion si estas en en el MyInbox
                    if (startupParameters !== undefined && startupParameters.hasOwnProperty("taskModel")) {
                        var taskModel = startupParameters.taskModel;
                        var taskData = taskModel.getData();

                        startupParameters.inboxAPI.setShowNavButton(false);
                        Workflow.onGetContextWorkflow(taskData).then(function (oContextWorkflow) {

                            // get task description and add it to the model
                            startupParameters.inboxAPI.getDescription("NA", taskData.InstanceID).done(function (dataDescr) {
                                taskModel.setProperty("/task/Description", dataDescr.Description);
                                debugger;
                            }).
                                fail(function (errorText) {
                                    debugger;
                                });

                            ///seteo modelos task y context
                            $.Component.setModel(taskModel, "task");
                            var contextModel = new JSONModel(oContextWorkflow);
                            $.Component.setModel(contextModel, "context");
                            var requesterModel = new JSONModel(oContextWorkflow.requester);
                            $.Component.setModel(requesterModel, "requester");
                            var headerModel = new JSONModel(oContextWorkflow.header);

                            $.Component.setModel(headerModel, "header");
                            debugger;
                            //console.log(oContextWorkflow);

                        }).catch(function (oError) {
                            debugger;
                            oThat.onErrorMessage(oError, "oErrorGetContext");
                        }).finally(function () {
                            sap.ui.core.BusyIndicator.hide();
                        });
                    } else {
                        sap.ui.core.BusyIndicator.hide();
                    }
                } catch (oError) {
                    debugger;
                    oThat.onErrorMessage(oError, "errorMyInbox");
                }
            },
            onCreateButtonAction: function () {
                var startupParameters = $.getComponentDataMyInbox.startupParameters;
                oThat.inboxApi = startupParameters.inboxAPI;
                oThat.inboxApi.removeAction("Aprobar");
                oThat.inboxApi.removeAction("Rechazar");
                oThat.inboxApi.addAction({
                    action: "Aprobar",
                    label: "Aprobar",
                    type: "accept" // (Optional property) Define for positive appearance
                }, function () {
                    oThat.onApprove();
                }, oThat);

                oThat.inboxApi.addAction({
                    action: "Rechazar",
                    label: "Rechazar",
                    type: "reject" // (Optional property) Define for negative appearance
                }, function () {
                    oThat.onReject();
                }, oThat);
            },


            //solicitamos confirmación para aprobar la solicitud
            onApprove: function () {
                this.oQuestionDialog = new sap.m.Dialog({
                    title: "Aprobar solicitud",
                    type: 'Message',
                    content: [
                        new sap.m.Label({
                            text: "¿Desea aprobar la solicitud?",
                            labelFor: 'rejectDialogTextarea'
                        })
                    ],
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: 'Confirmar',
                        press: function () {
                            this.onApproveConfirm();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        type: sap.m.ButtonType.Reject,
                        text: 'Cancelar',
                        press: function () {
                            this.onCancelConfirm();
                        }.bind(this)
                    })
                });
                this.oQuestionDialog.open();
            },

            onApproveConfirm: function () {
                this.oQuestionDialog.close();
                var oContextData = $.Component.getModel("context").getData();
                var comentario = this.getOwnerComponent().getModel("FilterModel").getProperty("/comentario");
                $.Component.getModel("context").setProperty("/commtextgral", comentario);
                    
                try {
                            oThat.updateSolicitudStatus(oContextData.header.porqs,"L")
                                .then(function (data) {
                                    if(data.Purchase_order_Req_Return.results[0].Type === "E"){
                                    MessageBox.error(data.ReturnSet.results[0].Message);
                                    }else{
                                    oThat.completeTask("A");
                                    }
                                }, function(error) {
                                    debugger;
                                    sap.m.MessageToast.show("Error al actualizar estado de la solicitud");
                                });                
                    } catch (oError) {       
                        debugger;   
                        sap.m.MessageToast.show(oError);
                    }      
                },

            onCancelConfirm: function () {
                this.oQuestionDialog.close();
            },

            //solicitamos confirmación para rechazar la solicitud
            onReject: function () {
                this.oQuestionDialog = new sap.m.Dialog({
                    title: "Rechazar solicitud",
                    type: 'Message',
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({
                                    text: "¿Desea rechazar la solicitud?",
                                    labelFor: 'rejectDialogTextarea'
                                }),
                                new sap.m.TextArea({
                                    placeholder: "Motivo de rechazo.."
                                })
                            ]

                        })
                    ],
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: 'Confirmar',
                        press: function () {
                            this.onRejectConfirm();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        type: sap.m.ButtonType.Reject,
                        text: 'Cancelar',
                        press: function () {
                            this.onCancelReject();
                        }.bind(this)
                    })
                });
                this.oQuestionDialog.open();
            },

            onRejectConfirm: function () {
                var textoRechazo = this.oQuestionDialog.getContent()[0].getItems()[1].getValue();
                $.Component.getModel("context").setProperty("/motivoRechazo", textoRechazo);
                this.oQuestionDialog.close();
                var oContextData = $.Component.getModel("context").getData();
                             
                   try {
                            oThat.updateSolicitudStatus(oContextData.header.porqs,"R")
                                .then(function (data) {                       
                                    if(data.Purchase_order_Req_Return.results[0].Type === "E"){
                                    MessageBox.error(data.ReturnSet.results[0].Message);
                                    }else{
                                    oThat.completeTask("R");
                                    }
                                }, function(error) {
                                    sap.m.MessageToast.show("Error al actualizar estado de la solicitud");
                                });                
                    } catch (oError) {  
                        debugger;        
                        sap.m.MessageToast.show(oError);
                    }      
        },


            completeTask: function (approvalStatus) {
                
                //Validar segun la accion
               ////**** */
                    
               //Completar la tarea
               $.Component.getModel("context").setProperty("/aprobadorN1", sCreatedByUser);
                $.Component.getModel("context").setProperty("/accion", approvalStatus);
                Workflow.completeTask();
            },

            updateSolicitudStatus(sSolNumber, sStatus) {
                oThat.getOwnerComponent().getModel().setUseBatch(false);
                return new Promise((res, rej) => {

                    oThat.getOwnerComponent().getModel().create("/Purchase_order_Req_H_Set", {
                        "Porqs": sSolNumber,
                        "Bsart":"",
                        "Schid": "",
                        "Bukrs": "",
                        "Status": "L",
                        "Ernam": sCreatedByUser,
                        "Swfid": "",
                        "Purchase_order_Req_POS": [],
                        "Purchase_order_Req_Return": []
                    }, {
                        success: res,
                        error: rej
                    })
                });
            }

        });
    });
