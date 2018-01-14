import forge from 'node-forge';
import { caStore } from "./CertificateAuthorities";

/**
 * Parse a hex representation of a PKCS#12 encoded certificate chain into forge certificate objects.
 *
 * @param {string} binCertificate A PKCS#12 encoded certificate, ordered from leaf certificate to root certificate in
 *                                binary form
 * @returns {Array} An array of certificates
 */
function getCertificatesFromHexCertificateBundle(binCertificate) {
    const decodedCertificate = forge.asn1.fromDer(binCertificate);
    const p12 = forge.pkcs12.pkcs12FromAsn1(decodedCertificate, '');
    return p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag].map((obj) => obj.cert);
}

/**
 * Get a private key from a pem encoded private key
 * @param {string} pemData A PEM-encoded private key in binary form
 * @returns {*} The forge private key object
 */
function getPrivateKeyFromPem(pemData) {
    return forge.pki.privateKeyFromPem(pemData);
}

export class CertificateChain {
    /**
     * Construct a certificate chain from a hex representation of a PEM encoded certificate.
     * @param {string} binCertificate A PKCS#12 encoded certificate, ordered from leaf certificate to root certificate
     *                                in binary form
     */
    constructor(binCertificate) {
        this.certificates = getCertificatesFromHexCertificateBundle(binCertificate);
    }

    /**
     * Check if the certificate chain is valid.
     * @returns {boolean} Whether or not the certificate chain is valid
     * @throws An error message if the certificate chain is not valid
     */
    verifyCertificateChain() {
        try {
            return forge.pki.verifyCertificateChain(caStore, this.certificates);
        } catch (error) {
            throw error.message;
        }
    }

    /**
     * Check if `signature` is a valid signature of the given message using the leaf of this certificate chain.
     * @param {string} message The message that is supposed to be signed
     * @param {string} signature The signature of the message
     * @returns {boolean} Whether or not the signature is valid
     */
    verifySignature(message, signature) {
        try {
            const leafCertificate = this.certificates[0];

            const md = forge.md.sha256.create();
            md.update(message, 'utf8');

            return leafCertificate.publicKey.verify(md.digest().bytes(), signature);
        } catch (error) {
            return false;
        }
    }

    getChainLength() {
        return this.certificates.length + 1;
    }

    getCertificateAtIndex(index) {
        if (index === 0) {
            const lastCertificate = this.certificates[this.certificates.length - 1];

            return caStore.getIssuer(lastCertificate);
        } else {
            return this.certificates[this.certificates.length - index];
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

    getLeafCertificatePublicKeyFingerprint() {
        const lastCertificate = this.certificates[this.certificates.length - 1];
        return forge.pki.getPublicKeyFingerprint(lastCertificate.publicKey).toHex();
    }

    /**
     * Create a signature for the given message using the given private key
     *
     * @param {string} message The message to sign
     * @param {string} privateKeyData A PEM-encoded private key in binary form
     * @returns {string} The signature of the message using the given private key in binary form
     */
    static generateSignature(message, privateKeyData) {
        const privateKey = getPrivateKeyFromPem(privateKeyData);
        const md = forge.md.sha256.create();
        md.update(message, 'utf8');
        return privateKey.sign(md);
    }

    /**
     * Convert a PEM-encoded certificate chain to a binary PKCS#12 certificate
     * @param {string} pemCertificateString A PEM-encoded certificate chain from leaf certificate to root
     * @returns {string} A binary string in PKCS#12 representing the same certificate chain
     */
    static convertPemCertificateToPKCS12Bytes(pemCertificateString) {
        const certificateStrings = pemCertificateString.split("-----BEGIN CERTIFICATE-----").map((val) => "-----BEGIN CERTIFICATE-----" + val).splice(1);
        const certificates = certificateStrings.map((certificateString) => {
            return forge.pki.certificateFromPem(certificateString);
        });
        const p12 = forge.pkcs12.toPkcs12Asn1(null, certificates, '');
        return forge.asn1.toDer(p12).getBytes();
    }
}
