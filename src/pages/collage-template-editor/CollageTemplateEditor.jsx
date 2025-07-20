import { useCallback, useEffect, useState } from "react";
import {
  Canvas,
  Rect,
  Textbox,
  FabricText,
  Group,
  FabricImage,
  FabricObject,
} from "fabric";
import { makeStyles } from "@material-ui/core/styles";
import {
  Row,
  Typography,
  Button,
  Input,
  Col,
  ColorPicker,
  Select,
  notification,
  Switch,
} from "antd";
import { extend } from "lodash";

import { getLocal, setLocal } from "../../services/dbService";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { Title, Text } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  canvas: {
    border: "1px solid black",
  },
  header: {
    marginTop: "1px",
  },
  box: {
    gap: "5px",
    flexDirection: "column",
    width: "900px",
    background: "#f6f6f6",
    padding: "15px",
  },
  listingButtons: {
    marginTop: "5px",
    gap: "5px",
  },
});

// Extend fabric.Object to always include 'id' in its JSON representation
FabricObject.prototype.toObject = (function (toObject) {
  return function (propertiesToInclude) {
    return extend(toObject.call(this, propertiesToInclude), {
      id: this.id || null,
    });
  };
})(FabricObject.prototype.toObject);

let canvasObject = null;

const CollageTemplateEditor = () => {
  const classes = useStyles();
  const [placeholderCount, setPlaceholderCount] = useState(1);
  const [bannerText, setBannerText] = useState("");
  const [bannerTextColor, setBannerTextColor] = useState("#ffffff");
  const [bannerColor, setBannerColor] = useState("#1677ff");
  const [bannerFontStyle, setBannerFontStyle] = useState("Times New Roman");
  const [bannerBorderColor, setBannerBorderColor] = useState("#000000");
  const [bannerBorderWidth, setBannerBorderWidth] = useState(1);
  const [showBorder, setShowBorder] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const getPlaceholderCount = async () => {
    const localPlaceholderCount = await getLocal("placeholder-count");
    if (localPlaceholderCount)
      setPlaceholderCount(parseInt(localPlaceholderCount));
  };

  useEffect(() => {
    getPlaceholderCount();
    canvasObject = new Canvas("templateCanvas", {
      width: 800,
      height: 800,
    });

    // Add draggable rectangles or image placeholders
    // const rect = new Rect({
    //   width: 100,
    //   height: 100,
    //   fill: 'blue',
    //   left: 100,
    //   top: 100,
    //   selectable: true
    // });
    // canvasObject.add(rect);

    // const imagePlaceholder = new Rect({
    //   width: 200,
    //   height: 150,
    //   stroke: 'black',
    //   strokeWidth: 2,
    //   fill: '#eef',
    //   left: 300,
    //   top: 50,
    //   selectable: true
    // });
    // const placeholderText = new FabricText('123', {
    //   fontFamily: 'Calibri',
    //   fontSize: 20,
    //   textAlign: 'center',
    //   originX: 'center',
    //   originY: 'center',
    //   left: 400,
    //   top: 70
    // });
    // var group = new Group([imagePlaceholder, placeholderText], {
    //   left: 300,
    //   top: 50
    // });

    // canvasObject.add(group);
    // canvasObject.add(imagePlaceholder);

    // const text = new Textbox('HELLO', {
    //   width: 50,
    //   height: 30,
    //   backgroundColor: 'blue',
    //   fill: 'white',
    //   left: 160,
    //   top: 230,
    //   selectable: true
    // });
    // canvasObject.add(text);

    document.addEventListener("keydown", async (event) => {
      const key = event.key;
      if (key === "Backspace" || key === "Delete") {
        await removeObject();
      }
    });
  }, []);

  const removeObject = useCallback(async () => {
    const activeObject = canvasObject.getActiveObject();
    await canvasObject.remove(activeObject);
  }, [canvasObject]);

  const removeObjects = useCallback(async () => {
    canvasObject.clear();
    setPlaceholderCount(1);
    await setLocal("placeholder-count", 1);
  }, [canvasObject]);

  const handleAddPlaceHolder = useCallback(async () => {
    const imagePlaceholder = new Rect({
      width: 200,
      height: 200,
      stroke: "black",
      strokeWidth: 2,
      fill: "transparent",
      left: 300,
      top: 50,
      selectable: true,
    });
    const placeholderText = new FabricText(`${placeholderCount}`, {
      fontFamily: "Calibri",
      fontSize: 20,
      textAlign: "center",
      originX: "center",
      originY: "center",
      left: 400,
      top: 150,
    });
    var group = new Group([imagePlaceholder, placeholderText], {
      left: 300,
      top: 50,
      id: `images-${placeholderCount}`,
    });

    await setLocal("placeholder-count", placeholderCount + 1);
    setPlaceholderCount((prev) => prev + 1);
    canvasObject.add(group);
  }, [canvasObject, placeholderCount]);

  const handleAddBanner = useCallback(() => {
    // Create the text first to measure it
    const text = new Textbox(bannerText, {
      fill: bannerTextColor,
      left: 160,
      top: 230,
      selectable: true,
      padding: 10,
      fontFamily: bannerFontStyle,
      backgroundColor: 'transparent',
    });

    // Get text dimensions after it's created
    const textWidth = text.width + 20; // Add padding
    const textHeight = text.height + 20; // Add padding

    // Create the background rectangle with text dimensions
    const backgroundRect = new Rect({
      width: textWidth,
      height: textHeight,
      fill: bannerColor,
      left: 160,
      top: 230,
      stroke: showBorder ? bannerBorderColor : 'transparent',
      strokeWidth: showBorder ? bannerBorderWidth : 0,
      selectable: false,
    });

    // Group them together
    const group = new Group([backgroundRect, text], {
      left: 160,
      top: 230,
      selectable: true,
    });

    canvasObject.add(group);
  }, [canvasObject, bannerText, bannerColor, bannerFontStyle, bannerBorderColor, bannerBorderWidth, bannerTextColor, showBorder]);

  const handleAddImageFromUrl = useCallback(() => {
    const pugImg = new Image();
    pugImg.onload = () => {
      const pug = new FabricImage(pugImg, {
        left: 50,
        top: 70,
        scaleX: 0.25,
        scaleY: 0.25,
      });
      canvasObject.add(pug);
    };
    pugImg.src = imageUrl;
  }, [canvasObject, imageUrl]);

  const handleUploadImage = useCallback(
    (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (eee) => {
        const img = new Image();
        img.onload = function () {
          const fabricImage = new FabricImage(img, {
            left: 50,
            top: 70,
            scaleX: 0.25,
            scaleY: 0.25,
          });
          canvasObject.add(fabricImage);
        };
        img.src = eee.target.result;
      };

      reader.readAsDataURL(file);
      const inputElement = document.getElementById("imageUpload");
      if (inputElement) inputElement.value = null;
    },
    [canvasObject]
  );

  const saveTemplate = useCallback(async () => {
    const templateJson = canvasObject.toJSON();
    await setLocal("collage-canvas-template", templateJson);
    notification.success({
      message: "Saved",
      description: "Template save successfully",
    });
  }, [canvasObject]);

  const loadTemplate = useCallback(async () => {
    const savedTemplate = await getLocal("collage-canvas-template");
    if (savedTemplate) {
      canvasObject.clear();
      await canvasObject.loadFromJSON(savedTemplate, () => {
        canvasObject.requestRenderAll();
      });
      notification.success({
        message: "Loaded",
        description: "Template loaded successfully",
      });
    } else {
      notification.error({
        message: "Error",
        description: "No template found.",
      });
    }
  }, [canvasObject]);

  const loadImage = async (canvas, placeholder, imageUrl) =>
    new Promise((resolve) => {
      const pugImg = new Image();
      pugImg.onload = () => {
        const pug = new FabricImage(pugImg, {
          left: placeholder.left,
          top: placeholder.top,
          originX: "left",
          originY: "top",
          selectable: false,
        });
        pug.scaleToWidth(placeholder.width * placeholder.scaleX);
        pug.scaleToHeight(placeholder.height * placeholder.scaleY);
        // Remove the placeholder and add the image
        canvas.remove(placeholder);
        canvas.add(pug);
        canvas.requestRenderAll();
        resolve(true);
      };
      pugImg.src = imageUrl;
    });

  const testTemplate = useCallback(async () => {
    const testTemplateCanvas = new Canvas("testTemplateCanvas", {
      width: 800,
      height: 800,
    });
    const savedTemplate = await getLocal("collage-canvas-template");
    if (savedTemplate) {
      testTemplateCanvas.clear();
      await testTemplateCanvas.loadFromJSON(savedTemplate, () => {
        testTemplateCanvas.requestRenderAll();
      });
      // Find the placeholder and replace it with an image
      let placeholders = testTemplateCanvas?.getObjects();
      placeholders = placeholders.filter(
        (obj) => obj.id && obj.id.startsWith("images")
      );

      for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        const imageUrl =
          "https://img.freepik.com/free-vector/set-company-logo-design-ideas-vector_53876-60292.jpg?w=1480&t=st=1727982699~exp=1727983299~hmac=d960ac2d84fd4f0d8b26a04df3d4d5a2cd14fea1dd3dbedc6b91967dcaa10205";
        await loadImage(testTemplateCanvas, placeholder, imageUrl);
      }

      const collageDataURL = testTemplateCanvas.toDataURL({
        format: "jpeg",
        quality: 1,
      });
      const link = document.createElement("a");
      link.href = collageDataURL;
      link.download = "collage.png";
      link.click();
      testTemplateCanvas.dispose();
    } else {
      notification.error({
        message: "Error",
        description: "No template found to test.",
      });
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    const templateJson = canvasObject.toJSON();
    if (templateJson?.objects?.length) {
      const jsonString = JSON.stringify(templateJson, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.download = "template.json";
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notification.success({
        message: "Downloaded",
        description: "Template downloaded successfully",
      });
    }
  }, [canvasObject]);

  const handleUploadTemplate = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (file && file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const templateJson = JSON.parse(e.target.result);
            if (templateJson?.objects?.length) {
              canvasObject.clear();
              await canvasObject.loadFromJSON(templateJson, () => {
                canvasObject.requestRenderAll();
              });
              notification.success({
                message: "Loaded",
                description: "Template loaded successfully",
              });
            } else {
              throw new Error("Invalid template file.");
            }
          } catch (err) {
            notification.error({
              message: "Error",
              description: "Invalid template file.",
            });
          }
          const inputElement = document.getElementById("template-upload");
          if (inputElement) inputElement.value = null;
        };
        reader.readAsText(file);
      } else {
        notification.error({
          message: "Error",
          description: "Please upload a valid template file.",
        });
        const inputElement = document.getElementById("template-upload");
        if (inputElement) inputElement.value = null;
      }
    },
    [canvasObject]
  );

  return (
    <PagesLayout dimensions="max-w-[96rem]">
      <div className="w-full flex justify-center">
        <div className="flex flex-col min-[1340px]:flex-row gap-4 w-full">
          <canvas id="templateCanvas" className={classes.canvas} />
          <div className="flex flex-col w-full">
          <h1 className="font-bold text-2xl">Image Template Creation</h1>
            <p>
              For a guide on how to use this Image Template please refer to this
              video:{" "}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-500"
              >
                Tutroial
              </a>
            </p>
            <div className="flex gap-2 flex-wrap mt-3">
              <PageBtn variant="blue" onClick={handleAddPlaceHolder}>
                Add Amazon Image
              </PageBtn>
              <PageBtn variant="red" onClick={removeObjects}>
                Reset Image Template
              </PageBtn>
              <PageBtn variant="blue" onClick={saveTemplate}>
                Save Template
              </PageBtn>
              <PageBtn onClick={loadTemplate}>Load Template</PageBtn>
              <PageBtn onClick={testTemplate}>Test Template</PageBtn>
            </div>
            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Upload Template</h2>
              <div className="mt-2 flex justify-between flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="template-upload"
                  accept=".json"
                  style={{ width: "240px" }}
                  onChange={handleUploadTemplate}
                />
                <PageBtn variant="blue" onClick={downloadTemplate}>
                  Download Template
                </PageBtn>
              </div>
            </div>
            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Add Images</h2>
              <div className="mt-2 flex justify-between flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  style={{ width: "200px" }}
                  onChange={handleUploadImage}
                />
                <span className="my-1">OR</span>
                <div className="w-full flex gap-2 flex-wrap">
                  <Input
                    placeholder="Enter Image Url"
                    className="w-full"
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <div className="flex justify-end w-full">
                    <PageBtn variant="blue" onClick={handleAddImageFromUrl}>
                      Add Image From URL
                    </PageBtn>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Add Banner</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Text
                  </h4>
                  <Input
                    placeholder="Add Text"
                    style={{
                      width: "250px",
                    }}
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                  />
                </div>
                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                  Background Color
                  </h4>
                  <ColorPicker
                    value={bannerColor}
                    showText
                    onChange={(e) => setBannerColor(e.toHexString())}
                  />
                </div>
                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Text Color
                  </h4>
                  <ColorPicker
                    value={bannerTextColor}
                    showText
                    onChange={(e) => setBannerTextColor(e.toHexString())}
                  />
                </div>
                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Font
                  </h4>
                  <Select
                    value={bannerFontStyle}
                    onChange={(val) => setBannerFontStyle(val)}
                    options={[
                      {
                        label: "Times New Roman",
                        value: "Times New Roman",
                      },
                      {
                        label: "Open Sans",
                        value: "Open Sans",
                      },
                      {
                        label: "Lato",
                        value: "Lato",
                      },
                      {
                        label: "Montserrat",
                        value: "Montserrat",
                      },
                      {
                        label: "Pacifico",
                        value: "Pacifico",
                      },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-col w-full">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">Add Border</h2>
                  <Switch
                    checked={showBorder}
                    onChange={(checked) => setShowBorder(checked)}
                  />
                </div>
                {showBorder && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div>
                      <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                        Color
                      </h4>
                      <ColorPicker
                        value={bannerBorderColor}
                        showText
                        onChange={(e) => setBannerBorderColor(e.toHexString())}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                        Thickness
                      </h4>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={bannerBorderWidth}
                        onChange={(e) => setBannerBorderWidth(Number(e.target.value))}
                        style={{ width: "100px" }}
                        addonAfter="px"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <PageBtn
                  variant="blue"
                  disabled={!bannerText}
                  onClick={handleAddBanner}
                >
                  Add Banner
                </PageBtn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PagesLayout>
  );

  return (
    <Row>
      <Col span={11}>
        <canvas id="templateCanvas" className={classes.canvas} />
      </Col>
      <Col
        span={13}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <Row>
          <Title level={4} style={{ marginTop: "0px" }}>
            Template Creation
          </Title>
        </Row>
        <Row
          style={{
            gap: "10px",
          }}
        >
          <Button type="primary" onClick={handleAddPlaceHolder}>
            Add Placeholder
          </Button>
          <Button type="primary" onClick={removeObjects}>
            Clear Canvas
          </Button>
          <Button type="primary" onClick={saveTemplate}>
            Save Template
          </Button>
          <Button type="primary" onClick={loadTemplate}>
            Load Template
          </Button>
          <Button type="primary" onClick={testTemplate}>
            Test Template
          </Button>
        </Row>
        <Row
          style={{
            gap: "10px",
            alignItems: "end",
          }}
        >
          <Row style={{ flexDirection: "column" }}>
            <Title level={4} style={{ marginBottom: "5px", marginTop: "0px" }}>
              Upload Template
            </Title>
            <input
              type="file"
              id="template-upload"
              accept=".json"
              style={{ width: "200px" }}
              onChange={handleUploadTemplate}
            />
          </Row>
          <Button type="primary" onClick={downloadTemplate}>
            Download Template
          </Button>
        </Row>
        <Row>
          <Title level={4} style={{ marginBottom: "5px" }}>
            Add Images
          </Title>
        </Row>
        <input
          type="file"
          id="imageUpload"
          accept="image/*"
          style={{ width: "200px" }}
          onChange={handleUploadImage}
        />
        <span>OR</span>
        <Row style={{ gap: "5px" }}>
          <Input
            placeholder="Enter Image Url"
            style={{
              width: "300px",
            }}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Button type="primary" onClick={handleAddImageFromUrl}>
            Add Image From URL
          </Button>
        </Row>
        <Row>
          <Title level={4} style={{ marginBottom: "5px" }}>
            Add Banner
          </Title>
        </Row>
        <Row style={{ alignItems: "end", gap: "5px" }}>
          <Row style={{ flexDirection: "column" }}>
            <Text>Text</Text>
            <Input
              placeholder="Add Text"
              style={{
                width: "250px",
              }}
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
            />
          </Row>
          <Row style={{ flexDirection: "column" }}>
            <Text>Color</Text>
            <ColorPicker
              value={bannerColor}
              showText
              onChange={(e) => setBannerColor(e.toHexString())}
            />
          </Row>
          <Row style={{ flexDirection: "column" }}>
            <Text>Font Style</Text>
            <Select
              value={bannerFontStyle}
              onChange={(val) => setBannerFontStyle(val)}
              options={[
                {
                  label: "Times New Roman",
                  value: "Times New Roman",
                },
                {
                  label: "Open Sans",
                  value: "Open Sans",
                },
                {
                  label: "Lato",
                  value: "Lato",
                },
                {
                  label: "Montserrat",
                  value: "Montserrat",
                },
                {
                  label: "Pacifico",
                  value: "Pacifico",
                },
              ]}
            />
          </Row>
          <Button
            type="primary"
            disabled={!bannerText}
            onClick={handleAddBanner}
          >
            Add Banner
          </Button>
        </Row>
      </Col>
      <canvas id="testTemplateCanvas" style={{ display: "none" }} />
    </Row>
  );
};

export default CollageTemplateEditor;
