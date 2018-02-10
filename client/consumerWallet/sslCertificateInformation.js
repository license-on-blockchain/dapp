import {lob} from "../../lib/LOB";
import {CertificateChain} from "../../lib/CertificateChain";
import {formatDate} from "../../lib/utils";
import {SSLCertificateRevokeCheck} from "./sslCertificateRevokeCheck";
import forge from 'node-forge';

Template.sslCertificateInformation.onCreated(function() {
    this.computations = new Set();

    this.licenseContract = this.data.licenseContract;

    this.selectedCertificateIndex = new ReactiveVar(null);

    this.certificateChain = new ReactiveVar(null);
    const certificateChainComputation = Tracker.autorun(() => {
        const sslCertificate = lob.licenseContracts.getSSLCertificate(this.licenseContract);
        if (sslCertificate) {
            try {
                const certificateChain = new CertificateChain(sslCertificate);
                this.certificateChain.set(certificateChain);
                this.selectedCertificateIndex.set(certificateChain.getChainLength() - 1);
            } catch (error) {
                this.certificateChain.set(null);
            }
        }
    });
    this.computations.add(certificateChainComputation);
});

Template.sslCertificateInformation.onDestroyed(function() {
    for (const computation of this.computations) {
        computation.stop();
    }
});

Template.sslCertificateInformation.helpers({
    certificateValidationError() {
        try {
            if (lob.licenseContracts.isSSLCertificateValid(Template.instance().licenseContract)) {
                return null;
            } else {
                // noinspection ExceptionCaughtLocallyJS
                throw TAPi18n.__('signatureValidationError.generic');
            }
        } catch (error) {
            return error;
        }
    },
    signatureValidationError() {
        return lob.licenseContracts.getSignatureValidationError(Template.instance().licenseContract);
    },
    certificates() {
        const certificateChain = Template.instance().certificateChain.get();
        const selectedIndex = Template.instance().selectedCertificateIndex.get();
        const certificates = [];
        for (let i = 0; i < certificateChain.getChainLength(); i++) {
            certificates.push({
                certificate: certificateChain.getCertificateAtIndex(i),
                index: i,
                selected: i === selectedIndex
            });
        }
        return certificates;
    },
    leafCertificateCommonName() {
        const certificateChain = Template.instance().certificateChain.get();
        return certificateChain ? certificateChain.getLeafCertificateCommonName() : "–";
    },
    rootCertificateCommonName() {
        const certificateChain = Template.instance().certificateChain.get();
        return certificateChain ? certificateChain.getRootCertificateCommonName() : "–";
    },
    selectedCertificate() {
        const index = Template.instance().selectedCertificateIndex.get();
        return Template.instance().certificateChain.get().getCertificateAtIndex(index);
    }
});

Template.sslCertificateInformation.events({
    'click .certificateRow'() {
        Template.instance().selectedCertificateIndex.set(this.index);
    }
});

Template.certificateRow.helpers({
    commonName() {
        return this.certificate.subject.getField("CN").value;
    },
    isRoot() {
        return this.index === 0;
    },
    indentation() {
        return this.index - 0.5;
    },
    selected() {
        return this.selected ? "selected" : "";
    }
});

Template.detailedCertificateInfo.helpers({
    subjectField(fieldName) {
        const field = this.certificate.subject.getField(fieldName);
        if (field) {
            return field.value;
        } else {
            return null;
        }
    },

    serialNumber() {
        return this.certificate.serialNumber;
    },

    version() {
        return this.certificate.version;
    },

    signatureAlgorithm() {
        return this.certificate.signatureOid;
    },

    notValidBefore() {
        return formatDate(this.certificate.validity.notBefore);
    },
    notValidAfter() {
        return formatDate(this.certificate.validity.notAfter);
    },

    publicKey() {
        return this.certificate.publicKey.n.toString(16).toUpperCase().match(/.{2}/g).join(' ');
    },
    exponent() {
        return this.certificate.publicKey.e.toString(10);
    },
    keyLength() {
        const publicKey = this.certificate.publicKey.n.toString(16);
        return publicKey.length * 4;
    }
});

Template.detailedCertificateInfo.events({
    'click .showCheckRevocationGuide'() {
        SSLCertificateRevokeCheck.show(forge.pki.certificateToPem(this.certificate));
    }
});