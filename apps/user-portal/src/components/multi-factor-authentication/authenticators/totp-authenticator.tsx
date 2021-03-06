/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Field, Forms, useTrigger } from "@wso2is/forms";
import QRCode from "qrcode.react";
import React, { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Button, Divider, Grid, Icon, List, Message, Modal, Popup, Segment } from "semantic-ui-react";
import { initTOTPCode, refreshTOTPCode, validateTOTPCode } from "../../../api";
import { ThemeIcon } from "../../../components/shared";
import { EnterCode, MFAIcons, QRCodeScan } from "../../../configs";
import { AlertLevels } from "../../../models";
import { AppConfig } from "../../../helpers";
import { MULTI_FACTOR_AUTHENTICATION, SECURITY, AUTHENTICATOR_APP } from "../../../constants";

export const TOTPAuthenticator: React.FunctionComponent<any> = (props): JSX.Element => {

    const { onAlertFired } = props;

    const [openWizard, setOpenWizard] = useState(false);
    const [qrCode, setQrCode] = useState("");
    const [step, setStep] = useState(0);
    const [error, setError] = useState(false);

    const [submit, setSubmit] = useTrigger();

    const { t } = useTranslation();

    const totpConfig = useContext(AppConfig)[SECURITY][MULTI_FACTOR_AUTHENTICATION][AUTHENTICATOR_APP];

    const translateKey = "views:components.mfa.authenticatorApp.";

    /**
     * Reset error and step when the modal is closed
     */
    useEffect(() => {
        if (!openWizard) {
            setError(false);
            setStep(0);
        }
    }, [openWizard]);

    /**
     * Makes an API call to verify the code entered by the user
     * @param code The code entered by the user
     */
    const verifyCode = (code: string) => {
        validateTOTPCode(code).then((response) => {
            if (response.data.isValid) {
                setStep(3);
            } else {
                setError(true);
            }
        }).catch(() => {
            setError(true);
        });
    };

    /**
     * Initiates the TOTP flow by getting QR code URL
     */
    const initTOTPFlow = () => {
        setStep(0);
        initTOTPCode().then((response) => {
            const qrCodeUrl = window.atob(response.data.qrCodeUrl);
            setQrCode(qrCodeUrl);
            setOpenWizard(true);
        }).catch((errorMessage) => {
            onAlertFired({
                description: t(translateKey + "notifications.initError.error.description", {
                    error: errorMessage
                }),
                level: AlertLevels.ERROR,
                message: t(translateKey + "notifications.initError.error.message")
            });
        });
    };

    /**
     * Refreshes the QR code
     */
    const refreshCode = () => {
        refreshTOTPCode().then((response) => {
            const qrCodeUrl = window.atob(response.data.qrCodeUrl);
            setQrCode(qrCodeUrl);
        }).catch((errorMessage) => {
            onAlertFired({
                description: t(translateKey + "notifications.initError.error.description", {
                    error: errorMessage
                }),
                level: AlertLevels.ERROR,
                message: t(translateKey + "notifications.initError.error.message")
            });
        });
    };

    /**
     * Generates content based on the input step
     * @param stepToDisplay The step number
     */
    const stepContent = (stepToDisplay: number): JSX.Element => {
        switch (stepToDisplay) {
            case 0:
                return renderQRCode();
            case 1:
                return renderVerifyCode();
            case 3:
                return renderSuccess();
        }
    };

    /**
     * Generates illustration based on the input step
     * @param stepToDisplay The step number
     */
    const stepIllustration = (stepToDisplay: number): JSX.Element => {
        switch (stepToDisplay) {
            case 0:
                return <QRCodeScan.ReactComponent />;
            case 1:
                return <EnterCode.ReactComponent />;
        }
    };

    /**
     * Generates button text based on the input step
     * @param stepToDisplay The step number
     */
    const stepButtonText = (stepToDisplay: number): string => {
        switch (stepToDisplay) {
            case 0:
                return t("common:continue");
            case 1:
                return t("common:verify");
            case 3:
                return t("common:done");
        }
    };

    /**
     * Generates header text based on the input step
     * @param stepToDisplay The step number
     */
    const stepHeader = (stepToDisplay: number): string => {
        switch (stepToDisplay) {
            case 0:
                return t(translateKey + "modals.scan.heading");
            case 1:
                return t(translateKey + "modals.verify.heading");
        }
    };

    /**
     * Generates the right button-click event based on the input step number
     * @param stepToStep The step number
     */
    const handleModalButtonClick = (stepToStep: number) => {
        switch (stepToStep) {
            case 0:
                setStep(1);
                break;
            case 1:
                setSubmit();
                break;
            case 3:
                setOpenWizard(false);
                break;
        }
    };

    /**
     * This renders the code verification content
     */
    const renderVerifyCode = (): JSX.Element => {
        return (
            <>
                <Forms
                    onSubmit={ (values: Map<string, string>) => {
                        verifyCode(values.get("code"));
                    }}
                    submitState={submit}
                >
                    <Field
                        name="code"
                        label={t(translateKey + "modals.verify.label")}
                        placeholder={t(translateKey + "modals.verify.placeholder")}
                        type="text"
                        required={true}
                        requiredErrorMessage={t(translateKey + "modals.verify.requiredError")}
                    />
                </Forms>
                {
                    error
                        ? (

                            <>
                                <Message error>{t(translateKey + "modals.verify.error")}</Message>
                                <p>{t(translateKey + "modals.verify.reScanQuestion") + " "}
                                    <p
                                        className="link"
                                        onClick={
                                            () => { setError(false); setStep(0); }
                                        }
                                    >
                                        {t(translateKey + "modals.verify.reScan")}
                                    </p>
                                </p>
                            </>
                        )
                        : null
                }
            </>
        );
    };

    /**
     * This renders the success message at the end of the TOTP flow
     */
    const renderSuccess = (): JSX.Element => {
        return (
            <Segment basic textAlign="center">
                <div className="svg-box">
                    <svg className="circular positive-stroke">
                        <circle
                            className="path"
                            cx="75"
                            cy="75"
                            r="50"
                            fill="none"
                            strokeWidth="5"
                            strokeMiterlimit="10"
                        />
                    </svg>
                    <svg className="positive-icon positive-stroke">
                        <g transform="matrix(0.79961,8.65821e-32,8.39584e-32,0.79961,-489.57,-205.679)">
                            <path
                                className="positive-icon__check"
                                fill="none"
                                d="M616.306,283.025L634.087,300.805L673.361,261.53"
                            />
                        </g>
                    </svg>
                </div>
                <p>{t(translateKey + "modals.done")}</p>
            </Segment>
        );
    };

    /**
     * This renders the QR code page
     */
    const renderQRCode = (): JSX.Element => {
        return (
            <>
                <Segment textAlign="center" basic>
                    <QRCode value={qrCode} />
                    <Divider hidden />
                    <p className="link" onClick={refreshCode}>{t(translateKey + "modals.scan.generate")}</p>
                </Segment>
                {totpConfig?.apps?.length > 0
                    ? (
                        <Message info>
                            <Message.Header>{t(translateKey + "modals.scan.messageHeading")}</Message.Header>
                            <Message.Content>
                                {t(translateKey + "modals.scan.messageBody") + " "}
                                <List bulleted>
                                    {totpConfig?.apps?.map((app, index) => (
                                        <List.Item key={index} >
                                            <a target="_blank" href={app.link}>
                                                {app.name}
                                            </a>
                                        </List.Item>
                                    ))}
                                </List>
                            </Message.Content>
                        </Message>
                    )
                    : null}
            </>
        );
    };

    /**
     * This renders the TOTP wizard
     */
    const totpWizard = (): JSX.Element => {
        return (
            <Modal
                dimmer="blurring"
                size="mini"
                open={openWizard}
                onClose={() => { setOpenWizard(false); }}
                className="totp"
            >
                {
                    step !== 3
                        ? (
                            < Modal.Header className="totp-header">
                                <div className="illustration">{stepIllustration(step)}</div>
                            </Modal.Header>
                        )
                        : null
                }
                <Modal.Content>
                    <h3>{stepHeader(step)}</h3>
                    <Divider hidden />
                    {stepContent(step)}
                </Modal.Content>
                <Modal.Actions>
                    {
                        step !== 3
                            ? (
                                < Button onClick={() => { setOpenWizard(false); }} className="link-button">
                                    {t("common:cancel")}
                                </Button>
                            )
                            : null
                    }
                    <Button onClick={() => { handleModalButtonClick(step); }} primary>
                        {stepButtonText(step)}
                    </Button>
                </Modal.Actions>

            </Modal>
        );
    };

    return (
        <>
            {totpWizard()}
            <Grid padded={true}>
                <Grid.Row columns={2}>
                    <Grid.Column width={11} className="first-column">
                        <List.Content floated="left">
                            <ThemeIcon
                                icon={MFAIcons.authenticatorApp}
                                size="mini"
                                twoTone={true}
                                transparent={true}
                                square={true}
                                rounded={true}
                                relaxed={true}
                            />
                        </List.Content>
                        <List.Content>
                            <List.Header>
                                {t(translateKey + "heading")}
                            </List.Header>
                            <List.Description>
                                {t(translateKey + "description")}
                            </List.Description>
                        </List.Content>
                    </Grid.Column>
                    <Grid.Column width={5} className="last-column">
                        <List.Content floated="right">
                            <Popup
                                trigger={
                                    (
                                        <Icon
                                            link={true}
                                            onClick={initTOTPFlow}
                                            className="list-icon"
                                            size="small"
                                            color="grey"
                                            name="eye"
                                        />
                                    )
                                }
                                content={t(translateKey + "hint")}
                                inverted
                            />
                        </List.Content>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </>
    );
};
