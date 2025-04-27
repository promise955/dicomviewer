import React, { useState, useEffect, useRef } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import { useDropzone } from 'react-dropzone';
import * as  cornerstoneTools from 'cornerstone-tools'
import Hammer from 'hammerjs';
import { ChevronLeftIcon, ChevronRightIcon, PanelTopInactive, RotateCcwIcon, SunIcon, ZoomInIcon } from 'lucide-react';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;


export default function DicomViewer() {

    const [files, setFiles] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [metadata, setMetadata] = useState(null);
    const dicomRef = useRef(null);

    useEffect(() => {
        if (!files || !dicomRef.current) return;

        cornerstoneTools.init({
            mouseEnabled: true,
            touchedEnabled: true,
            globalToolSyncEnabled: true,
            showSVGCursors: true
        });


        const element = dicomRef.current;
        cornerstone.enable(element);

        const { PanTool, ZoomTool, WwwcTool } = cornerstoneTools;
        cornerstoneTools.addTool(PanTool);
        cornerstoneTools.addTool(ZoomTool);
        cornerstoneTools.addTool(WwwcTool);


        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(files[currentImageIndex]);
        cornerstone.loadImage(imageId).then((image) => {
            cornerstone.displayImage(element, image);

            const reader = new FileReader();
            reader.onload = function (event) {
                const arrayBuffer = event.target?.result;
                const byteArray = new Uint8Array(arrayBuffer);
                const dataSet = dicomParser.parseDicom(byteArray);

                // Extract the metadata
                const instanceMetadata = {
                    patientName: dataSet.string('x00100010'),
                    patientId: dataSet.string('x00100020'),
                    patientBirthDate: dataSet.string('x00100030'),
                    patientSex: dataSet.string('x00100040'),
                    studyDate: dataSet.string('x00080020'),
                    studyDescription: dataSet.string('x00081030'),
                    modality: dataSet.string('x00080060'),
                    seriesDescription: dataSet.string('x0008103e'),
                    instanceNumber: dataSet.string('x00200013')
                };

                cornerstone.metaData.addProvider((type, imageIdCheck) => {
                    if (type === 'instance' && imageIdCheck === imageId) {
                        return instanceMetadata;
                    }
                });

                setMetadata(instanceMetadata)
            };

            reader.readAsArrayBuffer(files[currentImageIndex]);

        });

        return () => {
            cornerstone.disable(element);
        };
    }, [files, currentImageIndex]);


    const { getInputProps, getRootProps } = useDropzone({
        accept: { 'application/dicom': ['.dcm'] },
        onDrop: (acceptedFiles) => {
            setFiles(acceptedFiles);
            setCurrentImageIndex(0);
        },
        multiple: true,
    });

    const nextImage = () => {
        if (currentImageIndex < files?.length - 1) {
            const newIndex = currentImageIndex + 1;
            setCurrentImageIndex(newIndex);

        }
    };

    const prevImage = () => {
        if (currentImageIndex > 0) {
            const newIndex = currentImageIndex - 1;
            setCurrentImageIndex(newIndex);
        }
    };

    // Format metadata for display
    const formatMetadata = (meta) => {
        if (!meta) return null;

        const displayFields = [
            'Name', 'Patient ID', 'Sex',
            'Study Date', 'Study Description', 'Modality',
            'Series Description', 'Instance Number'
        ];

        const displaykey = [
            'patientName', 'patientId', 'patientSex',
            'studyDate', 'studyDescription', 'modality',
            'seriesDescription', 'instanceNumber'
        ];

        return displaykey.map((field, index) => (
            <div key={field} className="metadata-row">
                <span className="metadata-label font-semibold mx-2">{displayFields[index]}:</span>
                <span className="metadata-value">{String(meta[field])}</span>
            </div>
        ));

    };

    const activateTool = (toolName) => {
        const element = dicomRef.current;
        if (!element) return;
        cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });

    };

    const resetTools = () => {
        const element = dicomRef.current;
        if (!element) return;
        cornerstone.reset(element);
    };

    return (
        <div className={`drag-active grid grid-cols-1 lg:grid-cols-4 h-auto lg:h-dvh gap-2`}>
            {/* First column*/}
            <div className='lg:col-span-1 bg-slate-800 rounded-lg order-1 lg:order-none'>
                <div className='m-3 flex flex-col space-y-4'>
                    <h2 className="text-xl font-semibold text-white mb-2">DICOM Viewer</h2>
                    <div
                        className="w-full p-1 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
                        {...getRootProps()}
                    >
                        <input {...getInputProps()} className="hidden" />
                        <div className="text-center text-gray-600">
                            <p className="text-lg mb-3">Drag & drop your DICOM files here, or click to select files</p>
                            <p className="text-sm">Accepted file types: .dcm, .dicom</p>
                        </div>
                    </div>

                    {/* metadata */}
                    {metadata && (
                        <div className="bg-white p-5 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-blue-600">DICOM Metadata</h3>
                            <div className="overflow-y-auto max-h-60 lg:max-h-none">
                                {formatMetadata(metadata)}
                            </div>
                        </div>
                    )}

                    {/* controls */}
                    {files?.length > 0 && (
                        <>
                            <div className="">
                                <div className="text-center text-sm text-gray-500">
                                    Image {currentImageIndex + 1} of {files?.length}
                                </div>
                                <div className="flex justify-center gap-4 mt-2">
                                    <button
                                        onClick={prevImage}
                                        disabled={currentImageIndex === 0}
                                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeftIcon size={20} />
                                        <span className="inline">Previous</span>
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        disabled={currentImageIndex === files?.length - 1}
                                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <span className="inline">Next</span>
                                        <ChevronRightIcon size={20} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Second column */}
            <div className='lg:col-span-3 bg-black rounded-lg overflow-auto w-full relative h-[500px] lg:h-full order-2 lg:order-none'>
                <div className="w-full m-3">
                    <div className="flex flex-wrap gap-2 mb-4 w-full">
                        <button
                            onClick={() => activateTool('Wwwc')}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
                        >
                            <SunIcon size={20} />
                            <span className="inline">Window Level</span>
                        </button>
                        <button
                            onClick={() => activateTool('Pan')}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
                        >
                            <PanelTopInactive size={20} />
                            <span className="inline">Pan</span>
                        </button>
                        <button
                            onClick={() => activateTool('Zoom')}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
                        >
                            <ZoomInIcon size={20} />
                            <span className="inline">ZoomIn</span>
                        </button>
                        <button
                            onClick={resetTools}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
                        >
                            <RotateCcwIcon size={20} />
                            <span className="inline">Reset</span>
                        </button>
                    </div>

                    {!files && (
                        <div className="empty-state absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center text-white bg-black bg-opacity-50 z-10">
                            <p className="text-xl">Load a DICOM file to begin</p>
                        </div>
                    )}

                    <div
                        ref={dicomRef}
                        className="w-full h-full"
                        style={{
                            cursor: 'grabbing',
                            minHeight: '700px'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    )

}