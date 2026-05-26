import { css, keyframes } from "@emotion/react";
import { Space } from "../three/Space";
import { FullscreenModal } from "../components/FullscreenModal";
import { Title } from "@/components/text/Title";
import { Description } from "@/components/text/Description";
import { Column } from "@/components/flex/Column";
import { MapComponent } from "@/components/map/SelectMap";
import { useEffect, useState } from "react";
import {
  Button,
  NextButton,
  PrevButton,
} from "@/components/button/BottomButton";
import { BuildingHeights, Building } from "@/components/map/Processing";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useAreaStore } from "@/state/areaStore";
import { useActionStore } from "@/state/exportStore";
import { Modal } from "@/components/modal/Modal";
import { TopNav } from "@/components/nav/TopNav";
import { getCookie } from "@/utils/cookie";
import { Row } from "@/components/flex/Row";
import instanceFleet from "@/api/axios";
import { parseGpx } from "@/utils/gpx";
import { useRouteStore } from "@/state/routeStore";

const IconSize = css({
  width: "14px",
  height: "14px",
});

const spinAnimation = keyframes`
from { transform: rotate(0deg); }
to { transform: rotate(360deg); }
`;

function App() {
  const [isNextButtonDisabled, setIsNextButtonDisabled] = useState(true);
  const [areaData, setAreaData] = useState([]);
  const [steps, setSteps] = useState(["front", "processing"]);
  const [step, setStep] = useState(0);
  const [isWarnModal, setIsWarnModal] = useState(false);
  const [isExportModal, setIsExportModal] = useState(false);
  const [isFleetLogin, setIsFleetLogin] = useState(false);
  const [isFleetModal, setIsFleetModal] = useState(false);
  const [spaceList, setSpaceList] = useState([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isFetchingBuildings, setIsFetchingBuildings] = useState(false);
  const [hasFetchedBuildings, setHasFetchedBuildings] = useState(false);

  const setCenter = useAreaStore((state) => state.setCenter);
  const appendAreas = useAreaStore((state) => state.appendAreas);
  const setRoute = useRouteStore((s) => s.setRoute);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const routeName = useRouteStore((s) => s.name);
  const routePointCount = useRouteStore((s) => s.points.length);
  const setAction = useActionStore((state) => state.setAction);
  const setFleet = useActionStore((state) => state.setFleet);
  const exportSelected = useActionStore((state) => state.selected);
  const toggleExportCategory = useActionStore((state) => state.toggleCategory);

  const checkIsBig = () => {
    const a = areaData[0].lat - areaData[1].lat;
    const b = areaData[0].lng - areaData[1].lng;

    console.log(a + b);

    if (a + b > 0.1) {
      return true;
    } else {
      return false;
    }
  };

  const exportFile = () => {
    setAction(true);
  };

  const exportFleet = () => {
    setAction(true);
  };

  const getFleetSpaces = async () => {
    const getSpace: any = await instanceFleet.get("space");

    setSpaceList([
      ...getSpace.data.spaces.map((item) => {
        return {
          ...item,
          key: item.id,
        };
      }),
    ]);
  };

  const putGlbOnFleetSpace = (spaceId) => {
    setFleet(spaceId, "fleet");
    setTimeout(() => {
      exportFleet();
    }, 100);
  };

  const loadFleetSpace = () => {
    getFleetSpaces();
    setIsFleetModal(true);
  };

  const checkFleetLogin = () => {
    try {
      const isCookie = getCookie("token");
      if (isCookie) {
        setIsFleetLogin(true);
      }
    } catch (error) {}
  };

  const handleDone = (data) => {
    setAreaData(data);
    setCenter(data);
    console.log(data, "AAEE");
    setIsNextButtonDisabled(false);
    setBuildings([]);
    setHasFetchedBuildings(false);
  };

  const handleRemove = () => {
    setAreaData([]);
    setIsNextButtonDisabled(true);
    setBuildings([]);
    setHasFetchedBuildings(false);
  };

  const handleGpxFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseGpx(text);
      setRoute(parsed.points, parsed.name || file.name);
      const padLat = (parsed.bbox.north - parsed.bbox.south) * 0.05 || 0.002;
      const padLng = (parsed.bbox.east - parsed.bbox.west) * 0.05 || 0.002;
      const bbox = [
        { lat: parsed.bbox.north + padLat, lng: parsed.bbox.east + padLng },
        { lat: parsed.bbox.south - padLat, lng: parsed.bbox.west - padLng },
      ];
      setAreaData(bbox as any);
      setCenter(bbox);
      setBuildings([]);
      setHasFetchedBuildings(false);
      setIsNextButtonDisabled(false);
    } catch (err: any) {
      alert("GPX parse failed: " + (err?.message || err));
    }
  };

  const requestBuildings = async () => {
    setIsFetchingBuildings(true);

    const south = areaData[1].lat;
    const west = areaData[1].lng;
    const north = areaData[0].lat;
    const east = areaData[0].lng;
    const query = `[out:json][timeout:25];(way["building"]( ${south},${west},${north},${east} );relation["building"]( ${south},${west},${north},${east} ););out body geom;`;
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await response.json();
      const blds: Building[] = data.elements.map((element) => ({
        id: element.id,
        tags: element.tags,
        geometry: element.geometry
          ? element.geometry.map((pt) => ({ lat: pt.lat, lng: pt.lon }))
          : undefined,
      }));
      setBuildings(blds);
      appendAreas(blds);
      setHasFetchedBuildings(true);
    } catch (error) {
      console.error("Error fetching building data:", error);
    } finally {
      setIsFetchingBuildings(false);
    }
  };

  const handleClickNextStep = async () => {
    if (step == 0 && checkIsBig()) {
      setIsWarnModal(true);
      return false;
    }
    if (step == 1 && !hasFetchedBuildings) {
      await requestBuildings();
      return;
    }
    setStep(step + 1);
  };

  const handleClickPrevStep = () => {
    setStep(step - 1);
  };

  const handleClickExport = () => {
    setIsExportModal(true);
  };

  useEffect(() => {
    checkFleetLogin();
  }, []);

  return (
    <div css={css({ height: "100%", width: "100%" })}>
      <TopNav step={step} />

      <FullscreenModal isOpen={steps[step] == "front"}>
        <Column gap="1rem">
          <Column gap="0.5rem">
            <Title>Generate 3d map</Title>
            <Description>
              Tools to create 3D maps based on maps and export them in GLB
              format
            </Description>
          </Column>
          <MapComponent
            onRemove={handleRemove}
            onDone={handleDone}
          ></MapComponent>
          <Row gap="0.5rem">
            <label
              css={css({
                cursor: "pointer",
                padding: "8px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "13px",
                background: "#fafafa",
              })}
            >
              Upload GPX (Strava)
              <input
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleGpxFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {routePointCount > 0 && (
              <div css={css({ fontSize: "13px", alignSelf: "center", color: "#444" })}>
                {routeName || "route"} · {routePointCount} pts
                <button
                  onClick={clearRoute}
                  css={css({
                    marginLeft: "8px",
                    border: "none",
                    background: "transparent",
                    color: "#c33",
                    cursor: "pointer",
                  })}
                >
                  clear
                </button>
              </div>
            )}
          </Row>
        </Column>
      </FullscreenModal>

      <FullscreenModal isOpen={steps[step] == "processing"}>
        <Column gap="1rem">
          <Column gap="0.5rem">
            <Title>Processing</Title>
            <Description>
              Click Next Step to fetch building information. Once loaded, click
              Next Step again to view the 3D scene.
            </Description>

            <BuildingHeights
              buildings={buildings}
              loading={isFetchingBuildings}
            />
          </Column>
        </Column>
      </FullscreenModal>

      <PrevButton isShow={step != 0} onClick={handleClickPrevStep}>
        <ChevronLeft css={IconSize} /> Prev Step
      </PrevButton>

      <NextButton
        isShow={step != 2}
        disabled={isNextButtonDisabled || isFetchingBuildings}
        onClick={handleClickNextStep}
      >
        {isFetchingBuildings ? (
          <>
            <Loader2
              css={[
                IconSize,
                css({ animation: `${spinAnimation} 1s linear infinite` }),
              ]}
            />
            Fetching...
          </>
        ) : (
          <>
            Next Step <ChevronRight css={IconSize} />
          </>
        )}
      </NextButton>

      <NextButton isShow={step == 2} onClick={handleClickExport}>
        Export GLB <Download css={IconSize} />
      </NextButton>

      <Modal isOpen={isWarnModal} onClose={() => setIsWarnModal(false)}>
        <Column gap="0.5rem">
          <Title>The area is too big </Title>
          <Description>Do you want to proceed?</Description>
          <Button
            isShow={step != 2}
            disabled={isNextButtonDisabled}
            onClick={() => {
              setStep(step + 1);
              setIsWarnModal(false);
            }}
          >
            Next Step <ChevronRight css={IconSize} />
          </Button>
        </Column>
      </Modal>

      <Modal isOpen={isExportModal} onClose={() => setIsExportModal(false)}>
        <Column gap="0.5rem">
          <Title>Export</Title>
          <Description>勾選要匯出的內容</Description>
          <Column gap="0.25rem">
            {(
              [
                { key: "route", label: "路線" },
                { key: "buildings", label: "建築物 (含道路)" },
                { key: "terrain", label: "地形 (等高線)" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                css={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px 0",
                })}
              >
                <input
                  type="checkbox"
                  checked={exportSelected[opt.key]}
                  onChange={() => toggleExportCategory(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </Column>

          <Row gap="0.5rem">
            <Button
              isShow={true}
              disabled={
                !exportSelected.route &&
                !exportSelected.buildings &&
                !exportSelected.terrain
              }
              onClick={exportFile}
            >
              GLB Download <Download css={IconSize} />
            </Button>

            {/* {isFleetLogin ? (
              <Button isShow={true} onClick={loadFleetSpace}>
                Fleet Interlock
              </Button>
            ) : (
              <Button
                isShow={true}
                onClick={() => window.open("https://fleet.im/auth")}
              >
                Fleet Login
              </Button>
            )} */}
          </Row>
        </Column>
      </Modal>

      <Modal isOpen={isFleetModal} onClose={() => setIsFleetModal(false)}>
        <Column gap="0.5rem">
          <Title>Select Fleet Space</Title>
          {spaceList.map((item, index) => (
            <Button isShow={true} onClick={() => putGlbOnFleetSpace(item.id)}>
              {item.title}
            </Button>
          ))}
        </Column>
      </Modal>

      <Space></Space>
    </div>
  );
}

export default App;
