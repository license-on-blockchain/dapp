import forge from 'node-forge';
import { caStore } from "./CertificateAuthorities";

/**
 * Parse a hex representation of a PKCS#12 encoded certificate chain into forge certificate objects.
 *
 * @param {string} hexCertificate A hex representation of a PKCS#12 encoded certificate, ordered from leaf certificate
 *                                to root certificate
 * @returns {Array} An array of certificates
 */
function getCertificatesFromHexCertificateBundle(hexCertificate) {
    if (hexCertificate.startsWith("0x")) {
        hexCertificate = hexCertificate.substr(2);
    }
    const binCertificate = forge.util.hexToBytes(hexCertificate);
    const decodedCertificate = forge.asn1.fromDer(binCertificate);
    const p12 = forge.pkcs12.pkcs12FromAsn1(decodedCertificate, '');
    return p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag].map((obj) => obj.cert);
}

export class CertificateChain {
    /**
     * Construct a certificate chain from a hex representation of a PEM encoded certificate.
     * @param {string} hexCertificate A hex representation of a PKCS#12 encoded certificate, ordered from leaf
     *                                certificate to root certificate
     */
    constructor(hexCertificate) {
        this.certificates = getCertificatesFromHexCertificateBundle(hexCertificate);
    }

    /**
     * Check if the certificate chain is valid.
     */
    verifyCertificateChain() {
        try {
            return forge.pki.verifyCertificateChain(caStore, this.certificates);
        } catch (error) {
            // TODO: Display error message
            return false;
        }
    }

    /**
     * Check if `signature` is a valid signature of the given message using the leaf of this certificate chain.
     * @param {string} message The message that is supposed to be signed
     * @param {string} signature The signature of the message
     * @returns {boolean} Whether or not the signature is valid
     */
    verifySignature(message, signature) {
        if (signature.startsWith("0x")) {
            signature = signature.substr(2);
        }
        try {
            const leafCertificate = this.certificates[0];

            signature = forge.util.hexToBytes(signature);

            const md = forge.md.sha256.create();
            md.update(message, 'utf8');

            return leafCertificate.publicKey.verify(md.digest().bytes(), signature);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the common name of the leaf certificate in the chain
     * @returns {string} The common name of the leaf certificate
     */
    getLeafCertificateCommonName() {
        try {
            const leafCertificate = this.certificates[0];

            return leafCertificate.subject.getField("CN").value;
        } catch (error) {
            return "–";
        }
    }

    /**
     * Get the common name of the root certificate in the certificate store that issued the topmost certificate in this
     * chain.
     * @returns {string} The common name of the root certificate
     */
    getRootCertificateCommonName() {
        try {
            const lastCertificate = this.certificates[this.certificates.length - 1];

            const rootCertificate = caStore.getIssuer(lastCertificate);

            return rootCertificate.subject.getField("CN").value;
        } catch (error) {
            return "–";
        }
    }
}
