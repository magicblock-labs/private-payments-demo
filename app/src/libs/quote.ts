// import { constants } from "buffer";

// export type Quote = {
//   header: QuoteHeader;
//   report: Report;
//   authData: AuthData;
// };

// export type QuoteHeader = {
//   version: number;
//   attestationKeyType: number;
//   teeType: number;
//   qeSvn: number;
//   pceSvn: number;
//   qeVendorId: Uint8Array;
//   userData: Uint8Array;
// };

// export enum TEE_TYPE {
//   SGX = 0,
//   TDX = 129,
// }

// export enum BODY_TYPE {
//   SGX_ENCLAVE_REPORT = 1,
//   TD_REPORT10 = 2,
//   TD_REPORT15 = 3,
// }

// export type ReportBody = {
//   body_type: number; // u16
//   remainingBuffer: number; // u32
// };

// export type Report = {
//   teeTcbSvn: Uint8Array;
//   mrSeam: Uint8Array;
//   mrSignerSeam: Uint8Array;
//   seamAttributes: Uint8Array;
//   tdAttributes: Uint8Array;
//   xfam: Uint8Array;
//         mrTd: Uint8Array;
//   mrConfigId: Uint8Array;
//   mrOwner: Uint8Array;
//   mrOwnerConfig: Uint8Array;
//   rtMr0: Uint8Array;
//   rtMr1: Uint8Array;
//   rtMr2: Uint8Array;
//   rtMr3: Uint8Array;
//   reportData: Uint8Array;
// };

// export type AuthData = {
//   version: 3;
//   data: AuthDataV3;
// } | {
//   version: 4;
//   data: AuthDataV4;
// };

// export type AuthDataV3 = {
//     ecdsaSignature: Uint8Array;
//   ecdsaAttestationKey: Uint8Array;
//   qeReport: Uint8Array;
//   qeReportSignature: Uint8Array;
//   qeAuthData: Uint8Array;
//   certificationData: CertificationData;
// };

// export type AuthDataV4 = {
//   ecdsaSignature: Uint8Array;
//   ecdsaAttestationKey: Uint8Array;
//   certificationData: CertificationData;
//   qeReportData: QEReportCertificationData;
// };

// export type CertificationData = {
//     certType: number; // u16
//   body: Uint32Array; // u32
// };

// export type QEReportCertificationData = {
//   qeReport: Uint8Array;
//   qeReportSignature: Uint8Array;
//   qeAuthData: Uint8Array;
//   certificationData: CertificationData;
// };

// export function decodeQuote(quote: Buffer) {
//   let inputs = { buffer: quote };
//   let header = decodeQuoteHeader(inputs);

//   let report;
//   switch (header.version) {
//     case 3:
//       if (header.teeType !== TEE_TYPE.SGX) {
//         throw new Error("invalid tee type");
//       }
//       report = getSgxReport(inputs);
//       break;
//     case 4:
//       if (header.teeType === TEE_TYPE.SGX) {
//         report = getSgxReport(inputs);
//       } else if (header.teeType === TEE_TYPE.TDX) {
//         report = getTdx10Report(inputs);
//       } else {
//         throw new Error("invalid tee type");
//       }
//       break;
//     case 5:
//       let body = getReportBody(inputs);
//       switch (body.body_type) {
//         case BODY_TYPE.SGX_ENCLAVE_REPORT:
//           report = getSgxReport(inputs);
//           break;
//         case BODY_TYPE.TD_REPORT10:
//           report = getTdx10Report(inputs);
//           break;
//         case BODY_TYPE.TD_REPORT15:
//           report = getTdx15Report(inputs);
//           break;
//         default:
//           throw new Error("unsupported body type");
//       }
//       break;
//     default:
//       throw new Error(`Unsupported quote version: ${header.version}`);
//   }

//   let authData = decodeAuthData(header.version, inputs);

//   return {
//     header,
//     report,
//     auth_data: authData,
//   };
// }

// function decodeQuoteHeader(inputs: { buffer: Buffer }): QuoteHeader {
//   const header = {
//     version: inputs.buffer.readUInt16LE(0),
//     attestationKeyType: inputs.buffer.readUInt16LE(2),
//     teeType: inputs.buffer.readUInt32LE(4),
//     qeSvn: inputs.buffer.readUInt16LE(8),
//     pceSvn: inputs.buffer.readUInt16LE(10),
//     qeVendorId: Uint8Array.from(inputs.buffer.subarray(12, 28)),
//     userData: Uint8Array.from(inputs.buffer.subarray(28, 48)),
//   };

//   inputs.buffer = inputs.buffer.subarray(48);
//   return header;
// }

// function getSgxReport(inputs: { buffer: Buffer }): Report {
//   throw new Error("not implemented");
// }

// function getTdx10Report(inputs: { buffer: Buffer }): Report {
//   const report = {
//     teeTcbSvn: Uint8Array.from(inputs.buffer.subarray(0, 16)),
//     mrSeam: Uint8Array.from(inputs.buffer.subarray(16, 64)),
//     mrSignerSeam: Uint8Array.from(inputs.buffer.subarray(64, 112)),
//     seamAttributes: Uint8Array.from(inputs.buffer.subarray(112, 120)),
//     tdAttributes: Uint8Array.from(inputs.buffer.subarray(120, 128)),
//     xfam: Uint8Array.from(inputs.buffer.subarray(128, 136)),
//     mrTd: Uint8Array.from(inputs.buffer.subarray(136, 184)),
//     mrConfigId: Uint8Array.from(inputs.buffer.subarray(184, 232)),
//     mrOwner: Uint8Array.from(inputs.buffer.subarray(232, 280)),
//     mrOwnerConfig: Uint8Array.from(inputs.buffer.subarray(280, 328)),
//     rtMr0: Uint8Array.from(inputs.buffer.subarray(328, 376)),
//     rtMr1: Uint8Array.from(inputs.buffer.subarray(376, 424)),
//     rtMr2: Uint8Array.from(inputs.buffer.subarray(424, 472)),
//     rtMr3: Uint8Array.from(inputs.buffer.subarray(472, 520)),
//     reportData: Uint8Array.from(inputs.buffer.subarray(520, 584)),
//   };

//   inputs.buffer = inputs.buffer.subarray(584);
//   return report;
// }

// function getTdx15Report(inputs: { buffer: Buffer }): Report {
//   throw new Error("not implemented");
// }

// function getReportBody(inputs: { buffer: Buffer }): ReportBody {
//   const body = {
//     body_type: inputs.buffer.readUInt16LE(0),
//     remainingBuffer: inputs.buffer.readUInt32LE(2),
//   };
//   inputs.buffer = inputs.buffer.subarray(6);
//   return body;
// }

// function decodeAuthData(ver: number, inputs: { buffer: Buffer }): AuthData {
//   let authData: AuthData;
//   switch (ver) {
//     case 3:
//       let authDataV3: AuthDataV3 = {
//         ecdsaSignature: Uint8Array.from(inputs.buffer.subarray(0, 64)),
//         ecdsaAttestationKey: Uint8Array.from(inputs.buffer.subarray(64, 128)),
//         qeReport: Uint8Array.from(inputs.buffer.subarray(128, 512)),
//         qeReportSignature: Uint8Array.from(inputs.buffer.subarray(512, 576)),
//         qeAuthData: Uint8Array.from(inputs.buffer.subarray(576, 592)),
//         certificationData: {
//           certType: inputs.buffer.readUInt16LE(592),
//           body: inputs.buffer.subarray(594, -1),
//         },
//       };
//       inputs.buffer = inputs.buffer.subarray(594);
//       authData = { version: 3, data: authDataV3 };
//       break;
//     case 4:
//       let authDataV4: AuthDataV4 = {
//         ecdsaSignature: Uint8Array.from(inputs.buffer.subarray(0, 64)),
//         ecdsaAttestationKey: Uint8Array.from(inputs.buffer.subarray(64, 128)),
//         qeReportData: {
//           qeReport: Uint8Array.from(inputs.buffer.subarray(132, 516)),
//           qeReportSignature: Uint8Array.from(
//             inputs.buffer.subarray(512, 576)
//           ),
//           qeAuthData: Uint8Array.from(inputs.buffer.subarray(576, 578)),
//           certificationData: {
//             certType: inputs.buffer.readUInt16LE(578),
//             body: inputs.buffer.subarray(578, -1),
//           },
//         },
//         certificationData: {
//             certType: inputs.buffer.readUInt16LE(128),
//             body: inputs.buffer.readUInt32LE(130),
//           },
//       };
//       inputs.buffer = inputs.buffer.subarray(580);
//       authData = { version: 4, data: authDataV4 };
//       break;
//     default:
//       throw new Error("Unsupported auth data version");
//   }

//   return authData;
// }

// export function getCa(quote: Buffer) {
//         let raw_cert_chain = self
//             .raw_cert_chain()
//             .context("Failed to get raw cert chain")?;
//         let certs = utils::extract_certs(raw_cert_chain).context("Failed to extract certs")?;
//         let cert = certs.first().ok_or(anyhow!("Invalid certificate"))?;
//         let cert_der: Certificate =
//             der::Decode::from_der(cert).context("Failed to decode certificate")?;
//         let issuer = cert_der.tbs_certificate.issuer.to_string();
//         if issuer.contains(constants::PROCESSOR_ISSUER) {
//             return Ok(constants::PROCESSOR_ISSUER_ID);
//         } else if issuer.contains(constants::PLATFORM_ISSUER) {
//             return Ok(constants::PLATFORM_ISSUER_ID);
//         }
//         Ok(constants::PROCESSOR_ISSUER_ID)
// }

// function getRawCertChain(quote: Quote): Buffer {
//     let certificationData: CertificationData;
//     if (quote.authData.version === 3) {
//         certificationData = quote.authData.data.certificationData;
//     } else {
//         certificationData = quote.authData.data.qeReportData.certificationData;
//     }
//     if (certificationData.certType != 5) {
//         throw new Error(`Unsupported cert type: ${certificationData.certType}`);
//     }
//     return certificationData.body;
// }
